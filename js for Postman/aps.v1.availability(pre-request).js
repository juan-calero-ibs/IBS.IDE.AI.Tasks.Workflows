const options = {
  HBSI: "SUPPLY_HBSI",
  EXPEDIA: "SUPPLY_SRH_EAN",
  DERBYSOFT: "DERBYSOFT_SUPPLY_SEAMLESS",
  JUNIPER: "JUNIPER_ELEVATE"
};

const SELECTED = pm.environment.get("CHANNEL_SELECTOR") || "JUNIPER";

if (!options[SELECTED]) {
  throw new Error(`Invalid channel selection: ${SELECTED}`);
}

pm.environment.set("affiliate", "BONOTEL");
pm.environment.set("channelCode", options[SELECTED]);
