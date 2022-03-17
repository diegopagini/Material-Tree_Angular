import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';

/**
 * Node for to-do item
 */
class ExpandableModule {
  items: ExpandableModule[];
  name: string;
  id: number;
  level: number;
  active: number;
}

/** Flat to-do item node with expandable and level information */
class FlatModule {
  id: number;
  name: string;
  level: number;
  expandable: boolean;
  active: number;
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = {
  result: [
    {
      id: 1,
      name: 'Aula Virtual',
      active: 1,
      level: 1,
      items: [
        {
          id: 2,
          name: 'Pagina Principal',
          level: 2,
          active: 1,
          items: [
            {
              id: 17,
              name: 'Visualizar pagina principal',
              level: 3,
              active: 1,
              items: [],
            },
            {
              id: 18,
              name: 'Filtrar por materias',
              level: 3,
              active: 0,
              items: [],
            },
          ],
        },
        {
          id: 3,
          name: 'Mis Clases',
          level: 2,
          active: 1,
          items: [
            {
              id: 21,
              name: 'Visualizar clases',
              level: 3,
              active: 1,
              items: [],
            },
            {
              id: 29,
              name: 'Resumen',
              level: 3,
              active: 1,
              items: [
                {
                  id: 35,
                  name: 'Visualizar resumen',
                  level: 4,
                  active: 1,
                  items: [],
                },
                {
                  id: 36,
                  name: 'Visualizar tareas de alumno',
                  level: 4,
                  active: 0,
                  items: [],
                },
              ],
            },
          ],
        },
        {
          id: 4,
          name: 'Asistencia',
          level: 2,
          active: 1,
          items: [
            {
              id: 77,
              name: 'Visualizar asistencia',
              level: 3,
              active: 1,
              items: [],
            },
          ],
        },
      ],
    },
  ],
};

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<FlatModule, ExpandableModule>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<ExpandableModule, FlatModule>();

  /** A selected parent node to be inserted */
  selectedParent: FlatModule | null = null;

  treeControl: FlatTreeControl<FlatModule>;

  treeFlattener: MatTreeFlattener<ExpandableModule, FlatModule>;

  dataSource: MatTreeFlatDataSource<ExpandableModule, FlatModule>;

  /** The selection for checklist */
  checklistSelection = new SelectionModel<FlatModule>(true /* multiple */);

  constructor() {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<FlatModule>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    this.dataSource.data = TREE_DATA.result;
  }

  private getLevel = (node: FlatModule) => node.level;

  private isExpandable = (node: FlatModule) => node.expandable;

  private getChildren = (node: ExpandableModule): ExpandableModule[] =>
    node.items;

  hasChild = (_: number, _nodeData: FlatModule) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: FlatModule) => _nodeData.name === '';
  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: ExpandableModule, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.id === node.id
        ? existingNode
        : new FlatModule();
    flatNode.name = node.name;
    flatNode.id = node.id;
    flatNode.active = node.active;
    flatNode.level = level;

    flatNode.expandable = !!node.items?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: FlatModule): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every((child) => {
        return this.checklistSelection.isSelected(child);
      });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: FlatModule): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some((child) =>
      this.checklistSelection.isSelected(child)
    );
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: FlatModule): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach((child) => this.checklistSelection.isSelected(child));
    this.checkAllParentsSelection(node);
  }

  /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
  todoLeafItemSelectionToggle(node: FlatModule): void {
    this.checklistSelection.toggle(node);
    this.checkAllParentsSelection(node);
  }

  /* Checks all the parents when a leaf node is selected/unselected */
  checkAllParentsSelection(node: FlatModule): void {
    let parent: FlatModule | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  checkRootNodeSelection(node: FlatModule): void {
    const nodeSelected = this.checklistSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every((child) => {
        return this.checklistSelection.isSelected(child);
      });
    if (nodeSelected && !descAllSelected) {
      this.checklistSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.checklistSelection.select(node);
    }
  }

  /* Get the parent node of a node */
  getParentNode(node: FlatModule): FlatModule | null {
    const currentLevel = this.getLevel(node);

    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }
}
