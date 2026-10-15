import React from "react";
import { MetricsPage } from "../components/common/MetricsPage";
export const ReportsView = ({
  navigateTo,
}: {
  navigateTo: (s: string) => void;
}) => <MetricsPage report navigateTo={navigateTo} />;
