import axios from 'axios';
import type { Conflict, AnalyzeResponse, CSSDeclaration } from '../types';

export class ConflictAnalyzer {
  private static readonly API_URL = '/api/analyze';

  static async analyze(html: string, css: string): Promise<Conflict[]> {
    try {
      const response = await axios.post<AnalyzeResponse>(this.API_URL, {
        html,
        css
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const conflicts = response.data.conflicts.map((c, idx) => ({
        ...c,
        id: `conflict-${idx}-${Date.now()}`
      }));

      return this.sortConflicts(conflicts);
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        return this.analyzeLocal(html, css);
      }
      throw error;
    }
  }

  private static analyzeLocal(html: string, css: string): Conflict[] {
    const conflicts: Conflict[] = [];
    const rules = this.parseCss(css);
    const elements = this.parseHtml(html);

    const propDeclarations = new Map<string, Array<{
      selector: string;
      value: string;
      important: boolean;
      specificity: number[];
      element: { tag: string; id: string; classes: string[]; html: string; key: string };
    }>>();

    elements.forEach(element => {
      rules.forEach(rule => {
        rule.selectors.forEach(selector => {
          if (this.selectorMatches(selector, element)) {
            rule.declarations.forEach(decl => {
              const key = `${element.key}-${decl.property}`;
              if (!propDeclarations.has(key)) {
                propDeclarations.set(key, []);
              }
              propDeclarations.get(key)!.push({
                selector,
                value: decl.value,
                important: decl.important,
                specificity: this.calculateSpecificity(selector),
                element
              });
            });
          }
        });
      });
    });

    let conflictIdx = 0;
    propDeclarations.forEach((decls) => {
      if (decls.length >= 2) {
        const uniqueValues = new Set(decls.map(d => d.value));
        if (uniqueValues.size > 1) {
          for (let i = 0; i < decls.length; i++) {
            for (let j = i + 1; j < decls.length; j++) {
              const d1 = decls[i];
              const d2 = decls[j];
              if (d1.value !== d2.value) {
                const winner = this.determineWinner(d1, d2);
                const loser = winner === d1 ? d2 : d1;

                conflicts.push({
                  id: `conflict-local-${conflictIdx++}`,
                  property: decls[0] ? this.getPropertyFromKey(decls, d1.element) : 'color',
                  selector1: d1.selector,
                  value1: d1.value,
                  important1: d1.important,
                  specificity1: d1.specificity,
                  selector2: d2.selector,
                  value2: d2.value,
                  important2: d2.important,
                  specificity2: d2.specificity,
                  element_tag: d1.element.tag,
                  element_classes: d1.element.classes,
                  element_id: d1.element.id,
                  element_html: d1.element.html,
                  winning_selector: winner.selector,
                  winning_value: winner.value,
                  losing_selector: loser.selector,
                  losing_value: loser.value,
                  element_key: d1.element.key
                });
              }
            }
          }
        }
      }
    });

    return this.sortConflicts(conflicts);
  }

  private static getPropertyFromKey(
    decls: Array<any>,
    element: any
  ): string {
    for (const d of decls) {
      if (d.element.key === element.key) {
        return d.property || 'color';
      }
    }
    return 'color';
  }

  private static parseCss(css: string): Array<{
    selectors: string[];
    declarations: CSSDeclaration[];
  }> {
    const rules: Array<{
      selectors: string[];
      declarations: CSSDeclaration[];
    }> = [];

    const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleMatches = cleanCss.match(/[^{}]+{[^}]*}/g) || [];

    ruleMatches.forEach(match => {
      const parts = match.match(/([^{]+){([^}]*)}/);
      if (parts) {
        const selectors = parts[1].split(',').map(s => s.trim()).filter(s => s);
        const declStr = parts[2];
        const declarations: CSSDeclaration[] = [];

        declStr.split(';').forEach(decl => {
          decl = decl.trim();
          if (decl && decl.includes(':')) {
            const [prop, ...valParts] = decl.split(':');
            let value = valParts.join(':').trim();
            let important = false;
            if (value.toLowerCase().includes('!important')) {
              important = true;
              value = value.replace(/!important/i, '').trim();
            }
            if (prop.trim() && value) {
              declarations.push({
                property: prop.trim(),
                value,
                important
              });
            }
          }
        });

        if (selectors.length > 0 && declarations.length > 0) {
          rules.push({ selectors, declarations });
        }
      }
    });

    return rules;
  }

  private static parseHtml(html: string): Array<{
    tag: string;
    id: string;
    classes: string[];
    html: string;
    key: string;
  }> {
    const elements: Array<{
      tag: string;
      id: string;
      classes: string[];
      html: string;
      key: string;
    }> = [];

    const parser = new DOMParser();
    try {
      const doc = parser.parseFromString(html, 'text/html');
      const allElements = doc.querySelectorAll('*');

      allElements.forEach((el, idx) => {
        const tag = el.tagName.toLowerCase();
        if (['script', 'style', 'meta', 'link', 'head', 'html', 'body'].includes(tag)) {
          return;
        }

        const id = el.id || '';
        const classes = Array.from(el.classList);
        const elementKey = `${tag}${id ? '#' + id : ''}${classes.length ? '.' + classes.join('.') : ''}-${idx}`;

        elements.push({
          tag,
          id,
          classes,
          html: el.outerHTML,
          key: elementKey
        });
      });
    } catch (e) {
    }

    return elements;
  }

  private static selectorMatches(selector: string, element: {
    tag: string;
    id: string;
    classes: string[];
  }): boolean {
    selector = selector.trim();
    if (!selector) return false;

    if (selector.includes(',')) {
      return selector.split(',').some(s => this.selectorMatches(s.trim(), element));
    }

    if (selector === '*') return true;

    if (selector.includes(' ') || selector.includes('>') || selector.includes('+') || selector.includes('~')) {
      return this.simpleComplexMatch(selector, element);
    }

    if (selector.startsWith('#')) {
      return element.id === selector.slice(1);
    }

    if (selector.startsWith('.')) {
      return element.classes.includes(selector.slice(1));
    }

    if (selector.includes('[')) {
      const tagMatch = selector.match(/^[\w-]*/);
      if (tagMatch && tagMatch[0] && tagMatch[0] !== element.tag) {
        return false;
      }
      return true;
    }

    if (selector.includes(':')) {
      const baseSel = selector.split(':')[0];
      if (baseSel === '*') return true;
      if (baseSel === '') return true;
      if (baseSel.startsWith('#')) return element.id === baseSel.slice(1);
      if (baseSel.startsWith('.')) return element.classes.includes(baseSel.slice(1));
      return baseSel.toLowerCase() === element.tag.toLowerCase();
    }

    return selector.toLowerCase() === element.tag.toLowerCase();
  }

  private static simpleComplexMatch(selector: string, element: {
    tag: string;
    id: string;
    classes: string[];
  }): boolean {
    const parts = selector.split(/\s+|>|\+|~/).map(p => p.trim()).filter(p => p);
    if (parts.length === 0) return false;
    const lastPart = parts[parts.length - 1];
    return this.selectorMatches(lastPart, element);
  }

  private static calculateSpecificity(selector: string): number[] {
    let a = 0, b = 0, c = 0;

    const idMatches = selector.match(/#[\w-]+/g);
    a = idMatches ? idMatches.length : 0;

    const classMatches = selector.match(/\.[\w-]+/g);
    const attrMatches = selector.match(/\[[^\]]+\]/g);
    const pseudoClassMatches = selector.match(/:(?!:)[\w-]+(\([^)]*\))?/g);
    b = (classMatches ? classMatches.length : 0) +
      (attrMatches ? attrMatches.length : 0) +
      (pseudoClassMatches ? pseudoClassMatches.length : 0);

    const elemMatches = selector.match(/(?<![#.\[:])\b[a-zA-Z][\w-]*\b/g);
    const pseudoElemMatches = selector.match(/::[\w-]+/g);
    c = (elemMatches ? elemMatches.length : 0) +
      (pseudoElemMatches ? pseudoElemMatches.length : 0);

    return [a, b, c];
  }

  private static determineWinner<T extends { important: boolean; specificity: number[]; selector: string; value: string }>(
    d1: T,
    d2: T
  ): T {
    if (d1.important && !d2.important) return d1;
    if (d2.important && !d1.important) return d2;

    for (let i = 0; i < 3; i++) {
      if (d1.specificity[i] > d2.specificity[i]) return d1;
      if (d2.specificity[i] > d1.specificity[i]) return d2;
    }

    return d2;
  }

  private static sortConflicts(conflicts: Conflict[]): Conflict[] {
    return conflicts.sort((a, b) => {
      const specA = Math.max(
        a.specificity1[0] * 10000 + a.specificity1[1] * 100 + a.specificity1[2],
        a.specificity2[0] * 10000 + a.specificity2[1] * 100 + a.specificity2[2]
      );
      const specB = Math.max(
        b.specificity1[0] * 10000 + b.specificity1[1] * 100 + b.specificity1[2],
        b.specificity2[0] * 10000 + b.specificity2[1] * 100 + b.specificity2[2]
      );
      return specB - specA;
    });
  }
}
