declare module 'bwip-js' {
  export interface ToCanvasOptions {
    bcid: string
    text: string
    scale?: number
    height?: number
    includetext?: boolean
    backgroundcolor?: string
    paddingwidth?: number
    paddingheight?: number
    textxalign?: 'left' | 'center' | 'right'
    textsize?: number
  }

  export interface BwipJs {
    toCanvas(
      canvas: HTMLCanvasElement | string,
      options: ToCanvasOptions
    ): void
  }

  const bwipjs: BwipJs
  export default bwipjs
}
