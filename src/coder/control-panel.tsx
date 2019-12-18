import * as React from "react";
import { Button, message, Input } from "antd";
import "antd/lib/button/style/index.css";
import { CoderManager } from "./manager";
import { LeUIHtml } from "../typings";
import copy from "copy-to-clipboard";
import { upperFirst } from "lodash";
import queryString from "query-string";

export class ControlPanel extends React.Component<any, any> {
  private _currentMode: string = "";
  private _developerId: string = "";

  componentDidMount() {
    document.addEventListener("click", e => {
      if (!this._currentMode) {
        return;
      }
      if (e.target) {
        const layer = CoderManager.getLayerFromElement(e.target);
        console.log(layer, "layer");
        if (!layer) {
          return;
        }
        switch (this._currentMode) {
          case "Web": {
            this.output(this.getWebCode(layer));
            break;
          }
          case "Web Style": {
            this.output(this.getWebStyleCode(layer));
            break;
          }
          case "React Native": {
            this.output(this.getRNCode(layer));
            break;
          }
          case "React Native Style": {
            this.output(this.getRNStyleCode(layer));
            break;
          }
        }
      }
    });
  }

  output = (result: string) => {
    if (result) {
      copy(result);
      message.success("成功复制到剪切板");
      if (this._developerId) {
        // 开发人员ip地址
        let url = `http://${
          this._developerId
        }:3778/data?resultString=${encodeURIComponent(result)}`;
        fetch(url, {
          method: "GET"
        });
      }
    }
  };

  ModeButtons = ["Web", "Web Style", "React Native", "React Native Style"];

  getWebCode = (layer: LeUIHtml.Layer) => {
    switch (layer.type) {
      case LeUIHtml.LayerType.element: {
        return `<span className="${layer.id.replace(/\-/g, "")}">${
          layer.content
        }</span>`;
      }
      case LeUIHtml.LayerType.list:
      case LeUIHtml.LayerType.container: {
        return `<div className="${layer.id.replace(/\-/g, "")}">${
          layer.content
        }</div>`;
      }
      case LeUIHtml.LayerType.text: {
        return `<p className="${layer.id.replace(/\-/g, "")}">${
          layer.content
        }</p>`;
      }
      case LeUIHtml.LayerType.picture: {
        return `<img id="${layer.id.replace(
          /\-/g,
          ""
        )}" alt="" src={require('')} />`;
      }
    }
  };

  getWebStyleCode = (tlayer: LeUIHtml.Layer) => {
    const depth = 0;
    let string = "";
    const tabString = new Array(depth).fill("  ").join("");
    string += `.${tlayer.id.replace(/\"/g, "").replace(/\-/g, "")}`;
    string += `{\n`;
    const contentTabString = new Array(depth + 1).fill("  ").join("");
    tlayer.codeTemplate.css.codes.forEach(code => {
      string += `${contentTabString}${code.property}: ${code.value};\n`;
    });
    string += `${tabString}}\n`;
    return string;
  };

  getRNCode = (layer: LeUIHtml.Layer) => {
    switch (layer.type) {
      case LeUIHtml.LayerType.element:
      case LeUIHtml.LayerType.list:
      case LeUIHtml.LayerType.container: {
        return `<View style={styles.${layer.id.replace(/\-/g, "")}}>${
          layer.content
        }</View>`;
      }
      case LeUIHtml.LayerType.text: {
        return `<Text style={styles.${layer.id.replace(/\-/g, "")}}>${
          layer.content
        }</Text>`;
      }
      case LeUIHtml.LayerType.picture: {
        return `<Image source={require('')} />`;
      }
    }
  };

  getRNStyleCode = (layer: LeUIHtml.Layer) => {
    const depth = 0;
    let string = "";
    const tabString = new Array(depth).fill("  ").join("");
    string += `${layer.id.replace(/\-/g, "").replace(/\"/g, "")}: `;
    string += `{\n`;
    const contentTabString = new Array(depth + 1).fill("  ").join("");
    layer.codeTemplate.css.codes.forEach((code, codeIndex) => {
      code.value = code.value.replace(/^\s/, "");
      let isPxValue = /px$/.test(code.value);
      if (
        !isPxValue &&
        ["letterSpacing", "fontSize", "lineHeight"].find(
          key => key === code.property
        )
      ) {
        isPxValue = true;
      }
      string += `${contentTabString}${code.property
        .split("-")
        .map((prop, pindex) => {
          if (pindex !== 0) {
            return upperFirst(prop);
          }
          return prop;
        })
        .join("")}: ${isPxValue ? "" : `"`}${
        isPxValue ? code.value.replace(/px/g, "") : code.value
      }${isPxValue ? "" : `"`}${
        codeIndex === layer.codeTemplate.css.codes.length - 1 ? "" : ","
      }\n`;
    });
    string += `${tabString}}\n`;
    return string;
  };

  onStartWork = (mode: string) => {
    this._currentMode = mode;
  };

  render() {
    return (
      <div
        style={{
          top: 60,
          right: 0,
          padding: 10,
          position: "fixed",
          display: "inline-block",
          background: "#fff",
          zIndex: 999
        }}
      >
        <Input
          style={{ width: 200 }}
          onChange={e => {
            this._developerId = e.target.value;
          }}
        ></Input>
        {this.ModeButtons.map(button => (
          <Button
            key={button}
            onClick={() => {
              this.onStartWork(button);
            }}
          >
            {button}
          </Button>
        ))}
      </div>
    );
  }
}
