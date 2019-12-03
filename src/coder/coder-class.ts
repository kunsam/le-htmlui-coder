import { LeUIHtml } from "../typings";

export abstract class CoderClass {
  public onArtboardsReady: (artboards: LeUIHtml.Artboard[]) => void;

  // 通知结束
  public onDone: () => void;
}
