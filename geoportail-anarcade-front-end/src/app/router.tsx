import {createBrowserRouter} from 'react-router-dom';
import Layout from './Layout';
import MapPage from '../features/carte/Mapage';
import FarmersPage from '../features/exploitants/FamersPage';
import FarmerDetailPage from '../features/exploitants/FamersPageDetails';
import DataPage from '../features/data/DataPage';
import DataSentPage from '../features/imports/DataSentPage'
// import Data from '../features/data/Data';

export const router=createBrowserRouter([
   { element: <Layout />,
     children:[
        { path: '/', element: <MapPage /> },
        { path: '/exploitants', element: <FarmersPage /> },
        { path: '/exploitants/:id', element: <FarmerDetailPage /> },
        {path:'/data',element:<DataPage/>},
        { path: '/data-sent', element: <DataSentPage /> },

     ]
   }
])

