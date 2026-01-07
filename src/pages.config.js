import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Bills from './pages/Bills';
import Maintenance from './pages/Maintenance';
import ItemGallery from './pages/ItemGallery';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "Vehicles": Vehicles,
    "Bills": Bills,
    "Maintenance": Maintenance,
    "ItemGallery": ItemGallery,
}

export const pagesConfig = {
    mainPage: "Calendar",
    Pages: PAGES,
    Layout: __Layout,
};