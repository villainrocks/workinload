/* This code fixed By Tg:@ImxCodex */
import { Activity, Info, ScrollText, Shield, Users, Wand2 } from 'lucide-react';

export const pageTitles = {
  '/dashboard': 'Admin Panel',
  '/drop': 'Number Drop',
  '/accounts': 'Accounts',
  '/about': 'About',
  '/logs': 'Activity Logs',
  '/users': 'Admin',
};

const primaryNavigation = [
  { to: '/dashboard', icon: Wand2, label: 'Receipt Broadcast', mobileLabel: 'Receipt' },
  { to: '/drop', icon: ScrollText, label: 'Number Drop', mobileLabel: 'Drop' },
  { to: '/accounts', icon: Users, label: 'Accounts', mobileLabel: 'Accounts' },
  { to: '/about', icon: Info, label: 'About', mobileLabel: 'About', mobileOnly: false },
];

const adminNavigation = {
  to: '/users',
  icon: Shield,
  label: 'Admin',
  mobileLabel: 'Admin',
};

const activityNavigation = {
  to: '/logs',
  icon: Activity,
  label: 'Activity Logs',
  mobileLabel: 'Logs',
};

export const getNavigationItems = (user, options = {}) => {
  const { includeAbout = true } = options;
  const items = includeAbout
    ? primaryNavigation
    : primaryNavigation.filter((item) => item.to !== '/about');

  if (user?.role === 'admin') {
    return [...items, activityNavigation, adminNavigation];
  }

  return items;
};
