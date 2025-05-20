import React from "react";
import Lottie from "react-lottie";
import robotAnimation from "./speakingrobot.json"; // put it in /src

const SpeakingRobot = ({ speaking }) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: robotAnimation,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  return (
    <div style={{ width: 150, margin: "0 auto" }}>
      <Lottie options={defaultOptions} height={100} width={100} />
    </div>
  );
};

export default SpeakingRobot;
