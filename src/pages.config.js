import Bills from './pages/Bills';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import ItemGallery from './pages/ItemGallery';
import Maintenance from './pages/Maintenance';
import Vehicles from './pages/Vehicles';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Bills": Bills,
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "ItemGallery": ItemGallery,
    "Maintenance": Maintenance,
    "Vehicles": Vehicles,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};