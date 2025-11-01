import React, { memo } from "react";
import LiquidEther from "./LiquidEther";

const LiquidEtherWrapper = memo(function LiquidEtherWrapper(props) {
  return <LiquidEther {...props} />;
});

export default LiquidEtherWrapper;