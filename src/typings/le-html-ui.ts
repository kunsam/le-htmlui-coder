export namespace LeUIHtml {
  export interface LayerTreeNode {
    layer: Layer;
    children: LayerTreeNode[];
  }
  export interface Artboard {
    id: string;
    layers: Layer[];
    treeLayers: LayerTreeNode[];
    flatTreeLayers: LayerTreeNode[];
  }
  export enum LayerType {
    container = "container", // 容器节点
    element = "element", // 普通元素
    list = "list", // 列表容器节点
    picture = "picture", // 使用图片节点
    text = "text" // 有文字content
  }
  export interface Layer {
    merged?: boolean;
    id: string;
    title: string;
    content: string;
    type: LayerType;
    size: {
      width: number;
      height: number;
    };
    percentageSize: {
      width: number;
      height: number;
    };
    // 左上角定位
    location: {
      top: number;
      left: number;
    };
    codeTemplate: {
      css: {
        codes: { property: string; value: string }[];
      };
    };
  }
}
