import type { FC } from "react";
import {
  DropdownMenuRoot,
  type DropdownMenuRootProps,
} from "./DropdownMenuRoot";
import { DropdownMenuItem } from "./DropdownMenuItem";

export const DropdownMenu: FC<DropdownMenuRootProps> & {
  Item: typeof DropdownMenuItem;
} = Object.assign(DropdownMenuRoot, { Item: DropdownMenuItem });
