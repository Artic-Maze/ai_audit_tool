import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { CrawlError } from "./errors.js";

// The crawler fetches user-supplied hosts, so refuse anything that resolves to
// a private, loopback, link-local or otherwise non-public address.
const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]) {
  PRIVATE.addSubnet(net, prefix, "ipv4");
}
// No ::ffff:0:0/96 rule: BlockList already checks IPv4-mapped addresses
// against the IPv4 rules, and that subnet would match every IPv4 address.
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
]) {
  PRIVATE.addSubnet(net, prefix, "ipv6");
}

function isPrivate(address) {
  return PRIVATE.check(address, isIP(address) === 6 ? "ipv6" : "ipv4");
}

export async function assertPublicHost(hostname) {
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new CrawlError("unreachable", `Couldn't find ${hostname}.`);
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivate(a.address))) {
    throw new CrawlError("not_public", `${hostname} isn't a public website.`);
  }
}
