import { lazy } from 'react';

// Lazy load all pages for code splitting
export const Dashboard = lazy(() => import('./Dashboard'));
export const Team = lazy(() => import('./Team'));
export const RoleManagement = lazy(() => import('./RoleManagement'));
export const Menu = lazy(() => import('./Menu'));
export const Combos = lazy(() => import('./Combos'));
export const Tables = lazy(() => import('./Tables'));
export const StaffAssignment = lazy(() => import('./StaffAssignment'));
export const Orders = lazy(() => import('./Orders'));
export const Analytics = lazy(() => import('./Analytics'));
export const Settings = lazy(() => import('./Settings'));
export const Compliance = lazy(() => import('./Compliance'));
export const Login = lazy(() => import('./Login'));