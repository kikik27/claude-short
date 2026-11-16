import React from "react";
import { Composition } from "remotion";
import { AiBelanjaShort, AI_BELANJA_FRAMES } from "./videos/ai-belanja/AiBelanja";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AiBelanjaShort"
        component={AiBelanjaShort}
        durationInFrames={AI_BELANJA_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BridgeShort"
        component={BridgeShort}
        durationInFrames={BRIDGE_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
