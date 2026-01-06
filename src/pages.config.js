import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Bills from './pages/Bills';
import Maintenance from './pages/Maintenance';
import Calendar from './pages/Calendar';
import ItemGallery from './pages/ItemGallery';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Vehicles": Vehicles,
    "Bills": Bills,
    "Maintenance": Maintenance,
    "Calendar": Calendar,
    "ItemGallery": ItemGallery,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};