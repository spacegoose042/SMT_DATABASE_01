import React from 'react';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-sy-black-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-sy-black-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-sy-black-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-sy-black-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-sy-black-900 placeholder:text-sy-black-400 focus:ring-0 sm:text-sm"
            placeholder="Search work orders, customers..."
            type="search"
            name="search"
          />
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-sy-black-400 hover:text-sy-black-500"
          >
            <span className="sr-only">View notifications</span>
            <div className="relative">
              <div className="h-6 w-6" aria-hidden="true">
                {/* Bell icon placeholder */}
                <div className="h-6 w-6 rounded-full border-2 border-sy-black-300"></div>
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-sy-gold-500"></div>
            </div>
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-sy-black-200"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5"
              id="user-menu-button"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-sy-green-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">U</span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span
                  className="ml-4 text-sm font-semibold leading-6 text-sy-black-900"
                  aria-hidden="true"
                >
                  User
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header; 