import type { FC } from "react";
import { SearchBoxRoot, type SearchBoxRootProps } from "./SearchBoxRoot";
import { SearchBoxTextArea } from "./SearchBoxTextArea";
import { SearchBoxFooter } from "./SearchBoxFooter";

export const SearchBox: FC<SearchBoxRootProps> & {
  TextArea: typeof SearchBoxTextArea;
  Footer: typeof SearchBoxFooter;
} = Object.assign(SearchBoxRoot, {
  TextArea: SearchBoxTextArea,
  Footer: SearchBoxFooter,
});
