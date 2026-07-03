import { createContext, useContext, useState, type ReactNode } from "react";

interface MonthContextType {
  month: number;
  year: number;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  startDate: string;
  endDate: string;
}

const now = new Date();
const MonthContext = createContext<MonthContextType>({
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  setMonth: () => {},
  setYear: () => {},
  startDate: "",
  endDate: "",
});

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  return (
    <MonthContext.Provider value={{ month, year, setMonth, setYear, startDate, endDate }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonthContext() {
  return useContext(MonthContext);
}
