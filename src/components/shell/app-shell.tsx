'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SessionControls } from '../../features/auth/session-controls';
import { Brand } from '../brand';
import { IconButton } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/fields';
import { Dialog } from '../ui/dialog';
import { Icon } from '../ui/icon';
import { navigation, type NavigationItem } from './navigation';
import { classes } from '../../lib/classes';

function Navigation({ pathname, items, collapsed = false, onNavigate }: { items: readonly NavigationItem[]; pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  return <nav aria-label="Main navigation" className="main-nav">{items.map((item) => <Link key={item.href} href={item.href} className={classes('nav-link', pathname === item.href && 'nav-link--active', item.href === '/connections' && 'nav-link--group')} aria-current={pathname === item.href ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} {...(onNavigate ? { onClick: onNavigate } : {})}><Icon name={item.icon} />{!collapsed && <span>{item.label}</span>}{!collapsed && pathname === item.href && <span className="nav-dot" aria-hidden="true" />}</Link>)}</nav>;
}

export function AppShell({ children, items = navigation, showDesignSystem = true }: { children: ReactNode; items?: readonly NavigationItem[]; showDesignSystem?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current !== pathname) { main.current?.focus(); previousPath.current = pathname; }
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 960px)');
    const closeOnDesktop = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener('change', closeOnDesktop);
    return () => media.removeEventListener('change', closeOnDesktop);
  }, []);
  return <div className={classes('app-shell', collapsed && 'app-shell--collapsed')}><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar" aria-label="Workspace sidebar"><div className="sidebar-brand"><Brand compact={collapsed} /></div>{!collapsed && <div className="workspace-label"><span className="workspace-avatar">BE</span><span>Bismillah Social AI<small>Bismillah Electronics · Internal</small></span></div>}<Navigation items={items} pathname={pathname} collapsed={collapsed} /><div className="sidebar-footer">{showDesignSystem && <Link href="/ui-kit" className="nav-link nav-link--development" title="Development component reference" aria-label={collapsed ? 'Design system' : undefined}><Icon name="spark" />{!collapsed && <span>Design system <small className="development-label">Dev</small></span>}</Link>}<IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><Icon name="collapse" /></IconButton>{!collapsed && <span className="sidebar-version">Internal content workspace.</span>}</div></aside><div className="shell-body"><header className="topbar"><div className="topbar-start"><IconButton label="Open navigation" className="mobile-menu-button" aria-haspopup="dialog" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Icon name="menu" /></IconButton><span className="mobile-product-name">Bismillah Social AI</span><span className="breadcrumb">Workspace <span aria-hidden="true">/</span> <strong>{navigation.find((item) => item.href === pathname)?.label ?? 'Design system'}</strong></span></div><div className="header-search" title="Workspace search is a visual placeholder."><Icon name="search" /><Input id="workspace-search" label="Search workspace preview" type="search" placeholder="Search workspace" disabled /></div><div className="topbar-end"><Badge tone="warning">UI preview</Badge><SessionControls /><span className="timezone">Asia/Karachi</span><span className="user-avatar" aria-label="Preview user">BE</span></div></header><main ref={main} id="main-content" tabIndex={-1} className="page-container">{children}</main><footer className="workspace-footer"><span>Bismillah Social AI</span><span>Thoughtful content. Human approved.</span></footer></div><Dialog open={mobileOpen} onClose={() => setMobileOpen(false)} title="Bismillah Social AI"><Navigation items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />{showDesignSystem && <Link className="nav-link nav-link--development" href="/ui-kit" onClick={() => setMobileOpen(false)}>Design system <small className="development-label">Dev</small></Link>}</Dialog></div>;
}
