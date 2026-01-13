const options = {
  EXPEDIA: "SUPPLY_SRH_EAN",
  DERBYSOFT: "DERBYSOFT_SUPPLY_SEAMLESS"
};

const SELECTED = pm.environment.get("CHANNEL_SELECTOR") || "DERBYSOFT";

if (!options[SELECTED]) {
  throw new Error(`Invalid channel selection: ${SELECTED}`);
}

pm.environment.set("affiliate", "BONOTEL");
pm.environment.set("channelCode", options[SELECTED]);
