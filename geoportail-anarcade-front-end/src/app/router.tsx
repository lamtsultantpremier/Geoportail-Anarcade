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
import AdminPage from '../features/admin/AdminPage'

// import Data from '../features/data/Data';

export const router=createBrowserRouter([
   { element: <Layout />,
     children:[
        { path: '/', element: <MapPage /> },
        { path: '/exploitants', element: <FarmersPage /> },
        { path: '/exploitants/:id', element: <FarmerDetailPage /> },
        {path:'/data',element:<DataPage/>},
        { path: '/data-sent', element: <DataSentPage /> },
        { path: '/denombrements', element: <DenombrementsPage /> },
        { path: '/menages', element: <MenagesPage /> },
        { path: '/sig', element: <SigPage /> },
      { path: '/administration', element: <AdminPage /> },

     ]
   }
])

