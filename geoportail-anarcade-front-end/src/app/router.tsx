import {createBrowserRouter} from 'react-router-dom';
import Layout from './Layout';
import MapPage from '../features/carte/Mapage';
import FarmersPage from '../features/exploitants/FamersPage';
import FarmerDetailPage from '../features/exploitants/FamersPageDetails';
import DataPage from '../features/data/DataPage';
import DataSentPage from '../features/imports/DataSentPage'
import DenombrementsPage from '../features/denombrements/DenombrementsPage'
import MenagesPage from '../features/menages/MenagesPage'

import SigPage from '../features/sig/SigPage'


// Admin Layout
// import AdminLayout from '../features/admin/AdminLayout'
// import AdminDashboard from '../features/admin/AdminDashboard'
// import AdminExploitants from '../features/admin/AdminExploitants'
// import AdminPlaceholder from '../features/admin/AdminPlaceholder'
// import AdminPage from '../features/admin/AdminPage'


import AdminGuard from '../features/admin/AdminGuard'
import AdminLayout from '../features/admin/AdminLayout'
import AdminDashboard from '../features/admin/AdminDashboard'
import AdminExploitants from '../features/admin/AdminExploitants'
import AdminUsers from '../features/admin/AdminUsers'
import AdminRoles from '../features/admin/AdminRoles'
import AdminImports from '../features/admin/AdminImports'
import AdminReferentiels from '../features/admin/AdminReferentiels'
import AdminLogs from '../features/admin/AdminLogs'
import AdminParametres from '../features/admin/AdminParametres'
import AdminBackups from '../features/admin/AdminBackups'
import { AdminParcelles, AdminMenages, AdminEnquetes, AdminDecoupage } from '../features/admin/AdminShortcuts'
import AdminVersions from '../features/admin/AdminVersions'

// import SuperAdminOnly from '../features/imports/SuperAdminOnly'
import RequireRight from '../features/admin/RequireRight'

// import Data from '../features/data/Data';

export const router=createBrowserRouter([
   { element: <Layout />,
     children:[
        { path: '/', element: <RequireRight droit="voir_carte"><MapPage /></RequireRight> },
        { path: '/exploitants', element:<RequireRight droit="voir_exploitants"><FarmersPage /></RequireRight> },
        { path: '/exploitants/:id', element: <RequireRight droit="voir_exploitants"><FarmerDetailPage /></RequireRight> },
        {path:'/data',element:<RequireRight droit="voir_statistique"><DataPage /></RequireRight>},
        { path: '/data-sent', element: <RequireRight droit="voir_donnees_validees"><DataSentPage /></RequireRight> },
        { path: '/denombrements', element: <RequireRight droit="voir_denombrement"><DenombrementsPage /></RequireRight> },
        { path: '/menages', element: <RequireRight droit="voir_menage"><MenagesPage /></RequireRight>},
        { path: '/sig', element: <SigPage /> },
      // { path: '/administration', element: <AdminPage /> },
     ]   
   },

     {
    path: '/administration',
    element: <AdminGuard><AdminLayout /></AdminGuard>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'exploitants', element: <div className="space-y-6"><h1 className="text-3xl font-bold">Exploitants</h1><AdminExploitants /></div> },
      { path: 'parcelles', element: <AdminParcelles /> },
      { path: 'menages', element: <AdminMenages /> },
      { path: 'enquetes', element: <AdminEnquetes /> },
      { path: 'utilisateurs', element: <AdminUsers /> },
      { path: 'roles', element: <AdminRoles /> },
      { path: 'imports', element: <AdminImports /> },
      { path: 'referentiels', element: <AdminReferentiels /> },
      { path: 'decoupage', element: <AdminDecoupage /> },
      { path: 'logs', element: <AdminLogs /> },
      { path: 'parametres', element: <AdminParametres /> },
      { path: 'sauvegardes', element: <AdminBackups /> },
      { path: 'versions', element: <AdminVersions /> },
    ],
  },
])

