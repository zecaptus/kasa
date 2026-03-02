import type { ReactNode } from 'react';
import { NavLink, type NavLinkProps } from 'react-router';

type MenuItemProps = {
  icon?: ReactNode;
  children?: ReactNode;
} & Omit<NavLinkProps, 'children'>;

export const MenuItem = ({ icon, children, ...props }: MenuItemProps) => {
  return (
    <NavLink
      {...props}
      className={({ isActive }) =>
        `flex gap-2 transition-colors ${isActive ? 'text-kasa-accent' : 'text-slate-400 hover:text-slate-200'}`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
};
