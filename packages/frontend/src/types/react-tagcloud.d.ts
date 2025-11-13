declare module 'react-tagcloud' {
  import { ComponentType } from 'react';

  export interface Tag {
    value: string;
    count: number;
  }

  export interface TagCloudProps {
    tags: Tag[];
    minSize?: number;
    maxSize?: number;
    renderer?: (tag: Tag, size: number, color: string) => React.ReactNode;
    shuffle?: boolean;
    colorOptions?: {
      luminosity?: string;
      hue?: string;
    };
  }

  export const TagCloud: ComponentType<TagCloudProps>;
}
