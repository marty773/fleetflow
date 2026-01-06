import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Bills from './pages/Bills';
import Maintenance from './pages/Maintenance';
import Calendar from './pages/Calendar';


export const PAGES = {
    "Dashboard": Dashboard,
    "Vehicles": Vehicles,
    "Bills": Bills,
    "Maintenance": Maintenance,
    "Calendar": Calendar,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};