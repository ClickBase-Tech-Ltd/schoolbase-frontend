declare module "qrcode" {
  export function toString(text: string, options?: any): Promise<string>;
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: any): Promise<HTMLCanvasElement>;
}
