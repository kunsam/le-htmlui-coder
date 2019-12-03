import { upperFirst } from "lodash";

export interface ReactComponentProps {
  renderHtml: string;
  imports: string[];
  componentName: string;
}

function getTabString(depth: number) {
  return new Array(depth).fill("  ").join("");
}

export class ReactComponent {
  public imports: string[];
  public componentName: string;
  public renderHtml: string;
  public componentClassName: string;
  public static HTML_START_DEPTH = 4;
  constructor(props: ReactComponentProps) {
    this.imports = [`import * as React from 'react'`].concat(props.imports);
    this.componentName = props.componentName;
    this.renderHtml = props.renderHtml;
    this.componentClassName = `${this.componentName}-container`;
  }

  toString(depth: number = 0) {
    let string = "";
    string += this.imports.join("\n") + `\n\n`;
    // decorators层暂不实现
    string += `${getTabString(depth)}class ${upperFirst(
      this.componentName
    )}Component extends React.Component<any, any> {\n`;
    string += `${getTabString(
      depth + ReactComponent.HTML_START_DEPTH - 3
    )}render() {\n`;
    string += `${getTabString(
      depth + ReactComponent.HTML_START_DEPTH - 2
    )}return(\n`;
    string += `${getTabString(
      depth + ReactComponent.HTML_START_DEPTH - 1
    )}<div className="${this.componentClassName}">\n`;
    string += this.renderHtml;
    string += `${getTabString(
      depth + ReactComponent.HTML_START_DEPTH - 1
    )}</div>\n`;
    string += `${getTabString(depth + ReactComponent.HTML_START_DEPTH - 2)})\n`;
    string += `${getTabString(depth + ReactComponent.HTML_START_DEPTH - 3)}}\n`;
    string += `}\n`;
    return string;
  }
}
