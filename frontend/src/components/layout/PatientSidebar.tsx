import { useCallback } from "react";
import { Link, useLocation } from "react-router";

import {
  CalenderIcon,
  GridIcon,
  HorizontaLDots,
  TimeIcon,
  ListIcon,
} from "../../icons";
import { useSidebar } from "../../context/SidebarContext";
import SidebarWidget from "../../layout/SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/patient-dashboard",
  },
  {
    icon: <CalenderIcon />,
    name: "Book Appointment",
    path: "/patient-dashboard/book-appointment",
  },
  {
    icon: <TimeIcon />,
    name: "View Appointment",
    path: "/patient-dashboard/patientappointment",
  },
  {
    icon: <CalenderIcon />,
    name: "Calendar",
    path: "/patient-dashboard/calendar",
  },
  {
    icon: <ListIcon />,
    name: "Appointment History",
    path: "/patient-dashboard/appointment-history",
  },
];

const PatientSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link to="/patient-dashboard">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img className="dark:hidden" src="/images/logo/logo.png" alt="Logo" width={210} height={180} />
              <img className="hidden dark:block" src="/images/logo/logo.png" alt="Logo" width={150} height={40} />
            </>
          ) : (
            <img src="/images/logo/logo.png" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                {isExpanded || isHovered || isMobileOpen ? "Menu" : <HorizontaLDots className="size-6" />}
              </h2>
              <ul className="flex flex-col gap-4">
                {navItems.map((nav) => (
                  <li key={nav.name}>
                    {nav.path && (
                      <Link to={nav.path} className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}>
                        <span className={`menu-item-icon-size ${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                          {nav.icon}
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{nav.name}</span>}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>

        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default PatientSidebar;
