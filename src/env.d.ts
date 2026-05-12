declare module 'desmos' {
  const Desmos: any;
  export default Desmos;
}

declare module 'react-syntax-highlighter' {
  import type { ComponentType } from 'react';
  const SyntaxHighlighter: ComponentType<{
    language?: string;
    style?: Record<string, React.CSSProperties>;
    customStyle?: React.CSSProperties;
    PreTag?: keyof JSX.IntrinsicElements | ComponentType<unknown>;
    codeTagProps?: { style?: React.CSSProperties };
    showLineNumbers?: boolean;
    children?: string;
  }>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/hljs' {
  export const atomOneDark: Record<string, React.CSSProperties>;
}
