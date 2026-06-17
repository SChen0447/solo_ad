export interface CSSDeclaration {
  property: string;
  value: string;
  important: boolean;
}

export interface Conflict {
  id: string;
  property: string;
  selector1: string;
  value1: string;
  important1: boolean;
  specificity1: number[];
  selector2: string;
  value2: string;
  important2: boolean;
  specificity2: number[];
  element_tag: string;
  element_classes: string[];
  element_id: string;
  element_html: string;
  winning_selector: string;
  winning_value: string;
  losing_selector: string;
  losing_value: string;
  element_key: string;
}

export interface Modification {
  selector: string;
  property: string;
  old_value: string;
  new_value: string;
  action: string;
  reason: string;
}

export interface DiffBlock {
  type: 'deletion' | 'addition';
  selector: string;
  property: string;
  value: string;
}

export interface FixProposal {
  modifications: Modification[];
  diff_blocks: DiffBlock[];
  repaired_css_hint: string;
}

export interface AnalyzeResponse {
  conflicts: Conflict[];
  total_rules: number;
  total_conflicts: number;
  error?: string;
}

export interface RepairResponse {
  modifications: Modification[];
  diff_blocks: DiffBlock[];
  repaired_css_hint: string;
  error?: string;
}

export interface ExampleData {
  name: string;
  html: string;
  css: string;
  description: string;
}

export interface DomNode {
  tag: string;
  id: string;
  classes: string[];
  children: DomNode[];
  conflicts: Conflict[];
  isExpanded: boolean;
  elementKey: string;
}
