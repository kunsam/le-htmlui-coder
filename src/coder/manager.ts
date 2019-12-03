import { LeUIHtml } from "../typings";
import { CoderClass } from "./coder-class";
import { ReactWebCoder } from "./react-web/react-web";
import { cloneDeep } from "lodash";
import { CoderManagerUtil } from "./manager-util";

type ChildrenNode = { [key: string]: ChildrenNode };

export interface CoderManagerConfig {
  excludeLayers?: string[];
  excludeArea?: []; // [[0,0],[100, 6.3] 暂未实现
}

/**
 * 程序员管理
 * 统一处理UI稿，向 Coder 分发数据
 * @export
 * @class CoderManager
 */
export class CoderManager {
  private _config?: CoderManagerConfig;
  private _coders: Map<string, CoderClass>;
  constructor() {
    this._coders = new Map();
  }
  public registerCoder(id: string, coder: CoderClass) {
    this._coders.set(id, coder);
  }
  public run(config?: CoderManagerConfig) {
    this._config = config;
    window.onload = () => {
      setTimeout(() => {
        // 开始编程
        this._coder();
      }, 2000);
    };
  }
  private async _coder() {
    const artboards = await this.read_artboards();
    this._coders.forEach(coder => {
      coder.onArtboardsReady(artboards);
    });
    console.log(artboards, "artboardsartboards");
  }

  private _flatMapDeepTreeLayers(
    treeLayers: LeUIHtml.LayerTreeNode[],
    result: LeUIHtml.LayerTreeNode[] = []
  ) {
    treeLayers.forEach(treeLayer => {
      result.push({
        ...treeLayer,
        children: []
      });
      this._flatMapDeepTreeLayers(treeLayer.children, result);
    });
    return result;
  }

  private async read_artboards(): Promise<LeUIHtml.Artboard[]> {
    const dom_artboards = document.getElementsByClassName("artboard");
    let artboards = [];
    for (let i = 0; i < dom_artboards.length; i++) {
      // for (let i = 0; i < 1; i++) {
      const element = dom_artboards[i];
      (element as any).click();
      await CoderManagerUtil.delay(200);
      const layers = await this._readLayers();

      // 父id表
      let parentMap: Map<string, string> = new Map();
      // children表
      let childrensMap: Map<string, ChildrenNode> = new Map();
      const allLayersMap = layers.reduce((p, c) => p.set(c.id, c), new Map());

      // 删除父子引用
      const deleteParentAChild = (parentId: string, childId: string) => {
        parentMap.delete(childId);
        const histroy_parent_children = childrensMap.get(parentId);
        if (histroy_parent_children) {
          delete histroy_parent_children[childId];
          childrensMap.set(parentId, histroy_parent_children);
        } else {
          const _topParentId = topParentId(parentId);
          let top_parent_layer = childrensMap.get(_topParentId);
          if (top_parent_layer) {
            let current_layer_object = top_parent_layer;
            const _topParentVisitQueue = topParentVisitQueue(parentId);
            _topParentVisitQueue.shift();
            _topParentVisitQueue.forEach(key => {
              current_layer_object = current_layer_object[key];
            });
            delete current_layer_object[childId];
            childrensMap.set(_topParentId, top_parent_layer);
          }
        }
      };

      const topParentId: (i: string) => string = (parentId: string) => {
        return parentMap.get(parentId)
          ? topParentId(parentMap.get(parentId))
          : parentId;
      };

      // 访问栈
      const topParentVisitQueue: (i: string, result?: string[]) => string[] = (
        parentId: string,
        result: string[] = []
      ) => {
        result.push(parentId);
        if (parentMap.get(parentId)) {
          return topParentVisitQueue(parentMap.get(parentId), result);
        }
        return result.reverse();
      };

      // 添加引用
      const addParentAChild = (parentId: string, childId: string) => {
        if (parentMap.get(childId) === parentId) {
          return;
        }
        if (parentId) {
          const _topParentId = topParentId(parentId);
          let top_parent_layer = childrensMap.get(_topParentId) || {};
          let current_layer_object = top_parent_layer;
          const _topParentVisitQueue = topParentVisitQueue(parentId);
          _topParentVisitQueue.shift();
          _topParentVisitQueue.forEach(key => {
            current_layer_object = current_layer_object[key];
          });
          if (current_layer_object) {
            const child_layer_object = childrensMap.get(childId) || {};
            current_layer_object[childId] = child_layer_object;
            childrensMap.set(_topParentId, top_parent_layer);
            parentMap.set(childId, parentId);
          }
        }
      };

      // 图层对比
      layers.forEach(layer => {
        const polygon = CoderManagerUtil.getLayerPolygon(layer);
        layers.forEach(otherlayer => {
          if (layer.id === otherlayer.id) return;
          let layer_children = childrensMap.get(layer.id);
          if (layer_children && layer_children[otherlayer.id]) {
            return;
          }
          const other_polygon = CoderManagerUtil.getLayerPolygon(otherlayer);
          if (polygon.containsPolygon(other_polygon)) {
            let parentId = parentMap.get(otherlayer.id);
            let oldParentId;
            // 找到最小的parent 写入 删除其他parent的绑定关系
            if (parentId) {
              const history_parent_layer = allLayersMap.get(parentId);
              if (history_parent_layer) {
                const history_parent_polygon = CoderManagerUtil.getLayerPolygon(
                  history_parent_layer
                );
                if (history_parent_polygon.containsPolygon(polygon)) {
                  oldParentId = parentId;
                  deleteParentAChild(oldParentId, otherlayer.id);
                  // 老父亲链接到layer
                  parentId = layer.id;
                } else {
                  // 采用老图层作为父节点
                  if (!polygon.containsPolygon(history_parent_polygon)) {
                    // 谁面积更小用谁
                    if (polygon.area() < history_parent_polygon.area()) {
                      oldParentId = parentId;
                      deleteParentAChild(oldParentId, otherlayer.id);
                      parentId = layer.id;
                    }
                  }
                }
              }
            } else {
              parentId = layer.id;
            }
            if (oldParentId) {
              addParentAChild(oldParentId, layer.id);
            }
            addParentAChild(parentId, otherlayer.id);
          }
        });
      });
      layers.forEach(layer => {
        if (!parentMap.has(layer.id) && !childrensMap.has(layer.id)) {
          childrensMap.set(layer.id, {});
        }
      });
      console.log(cloneDeep(childrensMap), "childrensMap");

      // 递归计算
      const recursiveGetChildrenFromNode: (
        node: ChildrenNode,
        result?: LeUIHtml.LayerTreeNode[]
      ) => LeUIHtml.LayerTreeNode[] = (
        node: ChildrenNode,
        result: LeUIHtml.LayerTreeNode[] = []
      ) => {
        Object.keys(node).forEach(layerId => {
          const layer = allLayersMap.get(layerId);
          if (layer) {
            const children = recursiveGetChildrenFromNode(node[layerId]);
            if (children.length) {
              layer.type = LeUIHtml.LayerType.container;
            }
            result.push({
              layer,
              children
            });
          }
        });
        return result;
      };

      // 生成 treeLayers
      let treeLayers: LeUIHtml.LayerTreeNode[] = [];
      childrensMap.forEach((node, layerId) => {
        const layer = allLayersMap.get(layerId);
        if (layer) {
          const children = recursiveGetChildrenFromNode(node);
          if (children.length) {
            layer.type = LeUIHtml.LayerType.container;
          }
          treeLayers.push({
            layer,
            children
          });
        }
      });

      // 加工 treeLayers
      let handled_treeLayers = this._treeLayers_handle(treeLayers);
      artboards.push({
        id: `artboard-${i}`,
        layers,
        treeLayers: handled_treeLayers,
        flatTreeLayers: this._flatMapDeepTreeLayers(handled_treeLayers)
      });
    }
    return artboards;
  }
  /**
   * 图层算法层
   *
   * @private
   * @param {LeUIHtml.LayerTreeNode[]} treeLayers
   * @returns {LeUIHtml.LayerTreeNode[]}
   * @memberof CoderManager
   */
  private _treeLayers_handle(
    treeLayers: LeUIHtml.LayerTreeNode[]
  ): LeUIHtml.LayerTreeNode[] {
    // 暂且认为宽高相同且子元素数量的元素为同一种列表Layer
    let _treeLayers: LeUIHtml.LayerTreeNode[] = [];
    const layer_feature_map: Map<string, LeUIHtml.Layer> = new Map();

    // 顶部对齐分组合并
    const layer_feature_merge_map: Map<
      string,
      Map<string, LeUIHtml.LayerTreeNode>
    > = new Map();
    treeLayers.forEach(layer => {
      if (layer.layer.merged) {
        return;
      }
      const { height, width } = layer.layer.size;
      const { top } = layer.layer.location;
      const layer_feature_top = `${width}${height}${top}`;
      const history_merge_top =
        layer_feature_merge_map.get(layer_feature_top) || new Map();
      history_merge_top.set(layer.layer.id, layer);
      layer_feature_merge_map.set(layer_feature_top, history_merge_top);
    });
    layer_feature_merge_map.forEach(value => {
      if (value.size > 1) {
        treeLayers = treeLayers.filter(t => !value.has(t.layer.id));
        const children: LeUIHtml.LayerTreeNode[] = [];
        value.forEach(layer => {
          children.push({
            ...layer,
            layer: {
              ...layer.layer,
              merged: true,
              type: LeUIHtml.LayerType.element
            }
          });
        });
        const maxLeft = Math.max(...children.map(c => c.layer.location.left));
        const minLeft = Math.min(...children.map(c => c.layer.location.left));
        const newWidth = maxLeft - minLeft + children[0].layer.size.width;
        const newPWidth =
          newWidth / (children[0].layer.percentageSize.width / 100);
        treeLayers.push({
          children,
          layer: {
            id: children.map(c => c.layer.id).join("."),
            title: "",
            content: "",
            type: LeUIHtml.LayerType.container,
            size: {
              width: newWidth,
              height: children[0].layer.size.height
            },
            percentageSize: {
              width: newPWidth,
              height: children[0].layer.percentageSize.height
            },
            location: {
              top: children[0].layer.location.top,
              left: minLeft
            },
            codeTemplate: {
              css: {
                codes: []
              }
            }
          }
        });
      }
    });

    // TODO 左对齐分组合并

    treeLayers.forEach(layer => {
      if (this._config) {
        if (this._config.excludeLayers) {
          if (this._config.excludeLayers.find(e => e === layer.layer.id)) {
            return;
          }
        }
      }
      const { height, width } = layer.layer.size;
      // 尺寸相同 内容相同 标题或包含
      const layer_feature = `${width}${height}`;
      const h_layer = layer_feature_map.get(layer_feature);
      if (h_layer) {
        if (h_layer.content === layer.layer.content) {
          if (
            h_layer.title.includes(layer.layer.title) ||
            layer.layer.title.includes(h_layer.title)
          ) {
            const _find = _treeLayers.find(t => t.layer.id === h_layer.id);
            if (_find) {
              _find.layer.type = LeUIHtml.LayerType.list;
              return;
            }
          }
        }
      }

      layer_feature_map.set(layer_feature, layer.layer);

      _treeLayers.push({
        layer: layer.layer,
        children: this._treeLayers_handle(layer.children)
      });
    });
    _treeLayers.sort((a, b) => {
      if (a.layer.location.top === b.layer.location.top) {
        return a.layer.location.left - b.layer.location.left;
      }
      return a.layer.location.top - b.layer.location.top;
    });
    return _treeLayers;
  }

  private async _readLayers(): Promise<LeUIHtml.Layer[]> {
    const dom_layers = document.getElementsByClassName("layer");
    let layers: LeUIHtml.Layer[] = [];
    for (let i = 0; i < dom_layers.length; i++) {
      const element = dom_layers[i];
      const attributes = element.attributes;
      const actual_width: Attr | null = attributes.getNamedItem("data-width");
      const actual_height: Attr | null = attributes.getNamedItem("data-height");
      const percentage_width = attributes.getNamedItem("percentage-width");
      const percentage_height = attributes.getNamedItem("percentage-height");
      const style = attributes.getNamedItem("style");
      const id = attributes.getNamedItem("id");

      if (
        id &&
        style &&
        actual_width &&
        actual_height &&
        percentage_width &&
        percentage_height
      ) {
        let layer: LeUIHtml.Layer = {
          id: id.value,
          title: "",
          content: "",
          type: LeUIHtml.LayerType.element,
          size: {
            width: CoderManagerUtil.getAttrValue(actual_width),
            height: CoderManagerUtil.getAttrValue(actual_height)
          },
          percentageSize: {
            width: CoderManagerUtil.getAttrValue(percentage_width),
            height: CoderManagerUtil.getAttrValue(percentage_height)
          },
          location: {
            top: 0,
            left: 0
          },
          codeTemplate: {
            css: {
              codes: []
            }
          }
        };
        style.value.split(";").forEach(text => {
          if (/^left\:/.test(text.replace(/\s/, ""))) {
            layer.location.left = CoderManagerUtil.getPxPropertyValue(
              /left\:/,
              text
            );
          }
          if (/^top\:/.test(text.replace(/\s/, ""))) {
            layer.location.top = CoderManagerUtil.getPxPropertyValue(
              /top\:/,
              text
            );
          }
        });

        (element as any).click();
        await CoderManagerUtil.delay(200);
        const cssPanel = document.getElementById("css-panel");
        if (cssPanel) {
          const telement = cssPanel.querySelector("textarea#css");
          if (telement && telement.innerHTML) {
            layer.codeTemplate.css.codes = CoderManagerUtil.getStringProperties(
              telement.innerHTML
            );
          }
        }
        const inspector = document.getElementById("inspector");
        if (inspector) {
          const titleNode = inspector.querySelector("h2");
          if (titleNode) {
            layer.title = titleNode.innerHTML;
          }
          const labelNodes = inspector.querySelectorAll("label");
          for (let i = 0; i < labelNodes.length; i++) {
            const label = labelNodes[i];
            if (label) {
              const attr = label.getAttributeNode("data-label");
              if (attr && attr.value === "Content") {
                const text_area = label.querySelector("textarea");
                if (text_area) {
                  layer.content = text_area.innerHTML;
                }
              }
            }
          }
          // 类型分析器，暂时未拆出去
        }
        layer.type = this._getLayerType(layer, inspector);

        layers.push(layer);
      }
    }
    return layers;
  }
  /**
   * 图层类型分析器
   *
   * @private
   * @param {LeUIHtml.Layer} layer
   * @param {HTMLElement} [inspector]
   * @returns {LeUIHtml.LayerType}
   * @memberof CoderManager
   */
  private _getLayerType(
    layer: LeUIHtml.Layer,
    inspector?: HTMLElement
  ): LeUIHtml.LayerType {
    if (layer.content) {
      return LeUIHtml.LayerType.text;
    }
    if (inspector) {
      if (layer.title === "图片" || layer.title === "Bitmap") {
        return LeUIHtml.LayerType.picture;
      }
      const exportableNode = inspector.querySelector("ul.exportable");
      if (exportableNode) {
        return LeUIHtml.LayerType.picture;
      }
    }

    return LeUIHtml.LayerType.element;
  }
}

const coderManager = new CoderManager();

coderManager.registerCoder("ReactWebCoder", new ReactWebCoder());
coderManager.run();
