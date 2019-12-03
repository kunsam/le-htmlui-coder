import { CoderClass } from "../coder-class";
import { LeUIHtml } from "../../typings";
import FileSaver from "file-saver";
import JSZip from "jszip";
import { ReactComponent } from "./react-component";
import { Modal, Input, Select, message } from "antd";
import * as React from "react";
import "antd/lib/modal/style/index.css";
import "antd/lib/input/style/index.css";
import "antd/lib/select/style/index.css";
import "antd/lib/message/style/index.css";
// const prettier = require("prettier");



// 空图层处理
// 需要合并多余图层
// 需要文字下降梯度，用于指定文字tag类型

export interface ReactWebLayerNodeData {
  layer: LeUIHtml.Layer;
  htmlTag: string; // p div ComponentName
  tagProps: { [key: string]: any }; // className: "sd", data={{ a: 1, b: 2 }}
}

export interface ReactWebLayerNode extends ReactWebLayerNodeData {
  children: ReactWebLayerNode[];
  parent: ReactWebLayerNodeData | null;
}

export class ReactWebCoder implements CoderClass {
  constructor() {
    this._classNameQueryLayerMaps = [];
  }
  // className -> layerId
  private _classNameQueryLayerMaps: Map<string, string>[];

  /**
   * 递归html树
   *
   * @private
   * @param {ReactWebLayerNode[]} treeLayers
   * @param {number} [depth=0]
   * @returns {{ html: string; imports: string[] }}
   * @memberof ReactWebCoder
   */
  private _recursiveGetHtml(
    treeLayers: ReactWebLayerNode[],
    depth: number = 0
  ): { html: string; imports: string[] } {
    let result: { html: string; imports: string[] } = {
      html: "",
      imports: []
    };
    treeLayers.forEach(tlayer => {
      const tabString = new Array(depth).fill("  ").join("");

      const tlayerElementTag = tlayer.htmlTag;
      let propsStrings: string[] = [];
      Object.keys(tlayer.tagProps).forEach(key => {
        const value = tlayer.tagProps[key];
        propsStrings.push(`${key}=${value}`);
      });
      let startString = `${tabString}<${tlayerElementTag} ${propsStrings.join(
        " "
      )}`;

      const isTextNode =
        tlayer.layer.type === LeUIHtml.LayerType.element &&
        tlayer.layer.content.length > 0;

      if (tlayer.layer.type === LeUIHtml.LayerType.text || isTextNode) {
        result.html += startString;
        result.html += ">";
        result.html += `${tlayer.layer.content}`;
        result.html += `</${tlayerElementTag}>\n`;
      }

      if (tlayer.layer.type === LeUIHtml.LayerType.picture) {
        result.html += startString;
        result.html += ` />\n`;
      }

      if (tlayer.layer.type === LeUIHtml.LayerType.element && !isTextNode) {
        result.html += startString;
        result.html += ` />\n`;
      }

      if (tlayer.layer.type === LeUIHtml.LayerType.list) {
        result.html += `\n${tabString}\{\/* List *\/\}\n`;
        const d1Tab = new Array(depth + 1).fill("  ").join("");
        result.html += `${tabString}{this.props.list.map((item, index) => (\n`;
        result.html += `${d1Tab}<Item key={\`item\$\{index\}\`}>\n`;
        const childResult = this._recursiveGetHtml(tlayer.children, depth + 2);
        result.imports = result.imports.concat(childResult.imports);
        result.html += childResult.html;
        result.html += `${d1Tab}</Item>\n`;
        result.html += `${tabString}))}\n`;
      }

      if (tlayer.layer.type === LeUIHtml.LayerType.container) {
        result.html += startString;
        result.html += ">\n";
        const childResult = this._recursiveGetHtml(tlayer.children, depth + 1);
        result.imports = result.imports.concat(childResult.imports);
        result.html += childResult.html;
        result.html += `${tabString}</${tlayerElementTag}>\n`;
      }
    });
    return result;
  }
  /**
   * 递归CSs树
   *
   * @private
   * @param {ReactWebLayerNode[]} treeLayers
   * @param {number} [depth=0]
   * @returns {string}
   * @memberof ReactWebCoder
   */
  private _recursiveGetCss(
    treeLayers: ReactWebLayerNode[],
    depth: number = 0
  ): string {
    let string = "";
    treeLayers.forEach(tlayer => {
      // add imports
      if (tlayer.layer.codeTemplate.css.codes.length) {
        const tabString = new Array(depth).fill("  ").join("");
        if (tlayer.layer.type !== LeUIHtml.LayerType.list) {
          string += `${tabString}${tlayer.htmlTag}`;
        }
        if (tlayer.tagProps.className) {
          string += `.${tlayer.tagProps.className.replace(/\"/g, "")}`;
        }
        string += `{\n`;
        const contentTabString = new Array(depth + 1).fill("  ").join("");

        tlayer.layer.codeTemplate.css.codes.forEach(code => {
          string += `${contentTabString}${code.property}: ${code.value};\n`;
        });

        let childCss = this._recursiveGetCss(tlayer.children, depth + 1);
        string += childCss;
        string += `${tabString}}\n`;
      }
    });
    return string;
  }
  /**
   * 画板算法层
   *
   * @param {LeUIHtml.Artboard[]} artboards
   * @returns {LeUIHtml.Artboard[]}
   * @memberof ReactWebCoder
   */
  public handleArtboards(artboards: LeUIHtml.Artboard[]): LeUIHtml.Artboard[] {
    let new_artboards: LeUIHtml.Artboard[] = [];
    artboards.forEach(art => {
      new_artboards.push(art);
    });

    return new_artboards;
  }

  /**
   * 图层树映射
   *
   * @param {LeUIHtml.LayerTreeNode[]} treeLayers
   * @param {ReactWebLayerNodeData} [parent=null]
   * @param {number} [containerIndex=1]
   * @param {number} [imgIndex=1]
   * @param {number} [listIndex=1]
   * @returns {ReactWebLayerNode[]}
   * @memberof ReactWebCoder
   */
  public handleTreeLayers(
    treeLayers: LeUIHtml.LayerTreeNode[],
    parent: ReactWebLayerNodeData = null,
    containerIndex: number = 1,
    imgIndex: number = 1,
    listIndex: number = 1
  ): ReactWebLayerNode[] {
    let reactTreeLayers: ReactWebLayerNode[] = [];
    // let containerIndex = 1;
    // let imgIndex = 1;

    let textTotalInThisLevel = 0;
    treeLayers.forEach(tlayer => {
      if (tlayer.layer.type === LeUIHtml.LayerType.text) {
        textTotalInThisLevel++;
      }
    });
    let textIndex = 1;
    let elementIndex = 1;
    treeLayers.forEach(treeLayer => {
      let htmlTag = "div";
      let tagProps = {};
      if (treeLayer.layer.type === LeUIHtml.LayerType.container) {
        htmlTag = "div";
        tagProps = {
          className: `"container-${containerIndex}"`
        };
        containerIndex++;
      }
      if (treeLayer.layer.type === LeUIHtml.LayerType.element) {
        htmlTag = "span";
        tagProps = {
          className: `"element-${elementIndex}"`
        };
        elementIndex++;
      }
      if (treeLayer.layer.type === LeUIHtml.LayerType.list) {
        htmlTag = "List";
        tagProps = {
          className: `"list-${listIndex}"`
        };
        listIndex++;
      }
      if (treeLayer.layer.type === LeUIHtml.LayerType.picture) {
        htmlTag = "img";
        tagProps = {
          alt: `""`,
          src: `{require(\`path\`)}`,
          className: `"img-${imgIndex}"`
        };
        imgIndex++;
      }
      if (treeLayer.layer.type === LeUIHtml.LayerType.text) {
        // h(?) -> 标题
        // p -> 普通文字
        // span -> 标签文字
        // 文字标签有很多可能，并不是统一的，可以根据文字的大小(不一定吻合)
        // 这里需要在上层制定
        htmlTag = "p";
        const { location, size, percentageSize } = treeLayer.layer;
        let isCenter = false;
        if (
          location.left * 2 +
            size.width -
            size.width / (percentageSize.width / 100) <
          2
        ) {
          isCenter = true;
        }
        if (isCenter) {
          htmlTag = "h1";
        }
        // 这里的区分度不够，后续优化需要计数不同的文字标签
        if (textTotalInThisLevel >= 2) {
          tagProps = {
            className: `"text-${textIndex}"`
          };
          textIndex++;
        }
      }
      const data: ReactWebLayerNodeData = {
        htmlTag,
        tagProps,
        layer: treeLayer.layer
      };
      reactTreeLayers.push({
        ...data,
        parent,
        children: this.handleTreeLayers(
          treeLayer.children,
          data,
          containerIndex,
          imgIndex,
          listIndex
        )
      });
    });

    return reactTreeLayers;
  }

  private _onKeyDown(e: KeyboardEvent, artboards: LeUIHtml.Artboard[]) {
    let queryName: string = "";
    let chooseArtBoardIndex: number | null = null;
    if (e.which === 70) {
      Modal.confirm({
        title: "输出元素样式名查找",
        content: (
          <div>
            <h3>请选择对应的ArtBoard!</h3>
            <Select
              style={{ width: 200 }}
              onChange={(value: number) => {
                chooseArtBoardIndex = value;
              }}
            >
              {artboards.map((data, index) => (
                <Select.Option
                  key={data.id}
                  value={index}
                >{`artboard${index}`}</Select.Option>
              ))}
            </Select>
            <Input
              onChange={e => {
                const value = e.target.value;
                queryName = value;
              }}
            ></Input>
          </div>
        ),
        onOk: () => {
          console.log(this, "OK");
          if (chooseArtBoardIndex !== null && queryName) {
            const queryMap = this._classNameQueryLayerMaps[chooseArtBoardIndex];
            if (queryMap) {
              let layerId = queryMap.get(queryName);
              if (layerId) {
                if (layerId.split(".")[1]) {
                  message.info("该样式是一个容器");
                  layerId = layerId.split(".")[0];
                }
                const layer = document.getElementById(`${layerId}`);
                if (layer) {
                  layer.click();
                }
              } else {
                message.info("未找到节点");
              }
            }
          }
        },
        onCancel: () => {
          queryName = "";
          chooseArtBoardIndex = null;
        }
      });
    }
  }
  /**
   * 导出结果
   *
   * @param {LeUIHtml.Artboard[]} artboards
   * @memberof ReactWebCoder
   */
  public output(artboards: LeUIHtml.Artboard[]) {
    var zip = new JSZip();
    artboards.forEach((artboard, index) => {
      const treeLayers = this.handleTreeLayers(artboard.treeLayers);
      this._classNameQueryLayerMaps[index] = new Map();
      this._setQueryMap(treeLayers, index);
      const artboardFolder = zip.folder(`${artboard.id}`);
      let htmlResult = this._recursiveGetHtml(
        treeLayers,
        ReactComponent.HTML_START_DEPTH
      );
      const reactComponent = new ReactComponent({
        renderHtml: htmlResult.html,
        imports: htmlResult.imports,
        componentName: artboard.id.replace(/\-/g, "")
      });
      let htmlString = reactComponent.toString();

      if (htmlString) {
        // html = prettier.format(this._getReactComponentFile(artboard.id, html), {
        //   semi: false
        // });
        var html_blob = new Blob([htmlString], {
          type: "text/plain;charset=utf-8"
        });
        artboardFolder.file(`html.tsx`, html_blob);
      }

      let css = "\n";
      css += `.${reactComponent.componentClassName}{\n`;
      css += this._recursiveGetCss(treeLayers, 1);
      css += `}\n`;
      if (css) {
        var css_blob = new Blob([css], {
          type: "text/plain;charset=utf-8"
        });
        artboardFolder.file(`css.scss`, css_blob);
      }
    });
    zip.generateAsync({ type: "blob" }).then(content => {
      FileSaver.saveAs(content, "Data.zip");
    });
  }

  public onArtboardsReady(artboards: LeUIHtml.Artboard[]) {
    artboards = this.handleArtboards(artboards);
    document.addEventListener("keydown", e => this._onKeyDown(e, artboards));
    this.output(artboards);
  }
  /**
   * 生成查询表
   *
   * @private
   * @param {ReactWebLayerNode[]} treeLayers
   * @param {number} index
   * @memberof ReactWebCoder
   */
  private _setQueryMap(treeLayers: ReactWebLayerNode[], index: number) {
    treeLayers.forEach(tl => {
      if (tl.tagProps.className) {
        this._classNameQueryLayerMaps[index].set(
          tl.tagProps.className.replace(/\"/g, ""),
          tl.layer.id
        );
      }
      this._setQueryMap(tl.children, index);
    });
  }

  public onDone() {}
}
