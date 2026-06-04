import { NavbarRoot } from "./NavbarRoot";
import { NavbarLeft } from "./NavbarLeft";
import { NavbarMiddle } from "./NavbarMiddle";
import { NavbarRight } from "./NavbarRight";

export const Navbar = Object.assign(NavbarRoot, {
  Left: NavbarLeft,
  Middle: NavbarMiddle,
  Right: NavbarRight,
});
