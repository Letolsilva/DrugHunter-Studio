import type { FC } from "react";
import {
  HistoryItemCardRoot,
  type HistoryItemCardRootProps,
} from "./HistoryItemCardRoot";
import {
  HistoryItemCardLeft,
  HistoryItemCardTitle,
  HistoryItemCardDetails,
} from "./HistoryItemCardParts";

export const HistoryItemCard: FC<HistoryItemCardRootProps> & {
  Left: typeof HistoryItemCardLeft;
  Title: typeof HistoryItemCardTitle;
  Details: typeof HistoryItemCardDetails;
} = Object.assign(HistoryItemCardRoot, {
  Left: HistoryItemCardLeft,
  Title: HistoryItemCardTitle,
  Details: HistoryItemCardDetails,
});
