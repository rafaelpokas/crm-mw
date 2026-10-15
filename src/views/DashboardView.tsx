import React from "react";
import { MetricsPage } from "../components/common/MetricsPage";
export const DashboardView = ({
  navigateTo,
}: {
  navigateTo: (s: string) => void;
}) => <MetricsPage navigateTo={navigateTo} />;
