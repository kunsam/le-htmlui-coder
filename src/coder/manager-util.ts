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
  public static getLayerPolygon(layer: LeUIHtml.Layer): Polygon {
    return new Polygon([
      [layer.location.left, layer.location.top],
      [layer.location.left + layer.size.width, layer.location.top],
      [
        layer.location.left + layer.size.width,
        layer.location.top + layer.size.height
      ],
      [layer.location.left, layer.location.top + layer.size.height]
    ]);
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
