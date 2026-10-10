import React, { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const Joyride = ({ startTour, steps, tourName }) => {
  useEffect(() => {
    if (!startTour.current || !tourName.current) return;

    if (localStorage.getItem(tourName.current) === "true") return;
    // console.log("checking ..", tourName.current);
    
    const driverObj = driver({
      showProgress: true,
      overlayColor: "rgba(0,0,0,0.6)",
      stagePadding: 0,
      stageRadius: 0,
      animate: false,
      smoothScroll: true,
      steps: steps,
      onDestroyed: () => {
        startTour.current = false;
        localStorage.setItem(tourName.current, "true");
      },
    });

    driverObj.drive();
  }, [startTour, steps, tourName]);

  return null;
};

export default Joyride;
