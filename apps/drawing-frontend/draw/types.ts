export type Shape =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      id?: number;
    }
  | {
      type: "circle";
      centerX: number;
      centerY: number;
      radius: number;
      id?: number;
    }
  | {
      type: "pencil";
      points: { x: number; y: number }[];
      id?: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      fontSize: number;
      id?: number;
    };
