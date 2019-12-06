import Polygon from "polygon";
import { LeUIHtml } from "../typings";

export class CoderManagerUtil {
  /**
   * 获取图层多边形
   *
   * @static
   * @param {LeUIHtml.Layer} layer
   * @returns {Polygon}
   * @memberof CoderManagerUtil
   */
  public static getLayerPolygon(
    layer: LeUIHtml.Layer,
    error: number = 0
  ): Polygon {
    return new Polygon([
      [layer.location.left - error, layer.location.top - error],
      [
        layer.location.left + layer.size.width + error,
        layer.location.top - error
      ],
      [
        layer.location.left + layer.size.width + error,
        layer.location.top + layer.size.height + error
      ],
      [
        layer.location.left - error,
        layer.location.top + layer.size.height + error
      ]
    ]);
  }

  public static inCludeContainsPolygon(
    layer1: LeUIHtml.Layer,
    layer2: LeUIHtml.Layer
  ) {
    const layer1Polygon = this.getLayerPolygon(layer1);
    const layer2Points = [
      [layer2.location.left, layer2.location.top],
      [layer2.location.left + layer2.size.width, layer2.location.top],
      [
        layer2.location.left + layer2.size.width,
        layer2.location.top + layer2.size.height
      ],
      [layer2.location.left, layer2.location.top + layer2.size.height]
    ];
    if (layer1.location.left === layer2.location.left) {
      layer2Points[0][0] += 1;
      layer2Points[3][0] += 1;
    }

    if (layer1.location.top === layer2.location.top) {
      layer2Points[0][1] += 1;
      layer2Points[1][1] += 1;
    }

    if (
      layer1.location.left + layer1.size.width ===
      layer2.location.left + layer2.size.width
    ) {
      layer2Points[1][0] -= 1;
      layer2Points[2][0] -= 1;
    }
    if (
      layer1.location.top + layer1.size.height ===
      layer2.location.top + layer2.size.height
    ) {
      layer2Points[2][1] -= 1;
      layer2Points[3][1] -= 1;
    }
    return layer1Polygon.containsPolygon(new Polygon(layer2Points));
  }

  public static getAttrValue(attr: Attr) {
    return parseInt(attr.value.replace(/px/, ""));
  }

  public static getPxPropertyValue(rex: RegExp, text: string) {
    return parseInt(
      text
        .replace(/\s/, "")
        .replace(rex, "")
        .replace(/px/, "")
    );
  }

  public static getStringProperties(text: string) {
    let pros: { property: string; value: string }[] = [];
    text
      .replace(/\s/g, "")
      .split(";")
      .forEach(pair => {
        if (!pair) {
          return;
        }
        const pair_splited = pair.split(":");
        if (pair_splited[0] && pair_splited[1]) {
          pros.push({
            property: pair_splited[0],
            value: pair_splited[1]
          });
        }
      });
    return pros;
  }

  public static delay(msecond: number) {
    return new Promise(res =>
      setTimeout(() => {
        res();
      }, msecond)
    );
  }
}
