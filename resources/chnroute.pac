/*
 * Copyright (C) 2020 None
 */

var proxy = __PROXY__;
var direct = "DIRECT;";

var gfwDomainList = __DOMAINS__;

var chnIp4RangeList = __IPV4LIST__;
var chnIp6RangeList = __IPV6LIST__;

// all ip list must in order for matching
var subnetIp4RangeList = [
    0, 1,                    // 0.0.0.0/32
    167772160, 184549376,    // 10.0.0.0/8
    2130706432, 2130706688,  // 127.0.0.0/24
    2886729728, 2887778304,  // 172.16.0.0/12
    3232235520, 3232301056,  // 192.168.0.0/16
];
var subnetIp6RangeList = [
    [0x0, 0x0, 0x0, 0x0], [0x0, 0x0, 0x0, 0x2],                    // ::/127
    [0xfe800000, 0x0, 0x0, 0x0], [0xfe800000, 0x1, 0x0, 0x0],      // fe80::/64
    [0xfec00000, 0x0, 0x0, 0x0], [0xfec00000, 0x10000, 0x0, 0x0],  // fec0::/48
];

var hasOwnProperty = Object.hasOwnProperty;

function checkIp4(host) {
    var re_ipv4 = /^(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4}$/;
    return re_ipv4.test(host);
}

function convertIp4Address(strIp) {
    var bytes = strIp.split('.');
    var result = (bytes[0] << 24) |
        (bytes[1] << 16) |
        (bytes[2] << 8) |
        (bytes[3]);
    // the operands of all bitwise operators are converted to signed 32-bit integers in
    // two's complement format, so "1 << 31" is a negative number, use ">>>" to fix it
    return result >>> 0;
}

function isInIp4RangeList(ipRange, intIp) {
    if (ipRange.length === 0)
        return false;
    var left = 0, right = ipRange.length - 1;
    do {
        var mid = Math.floor((left + right) / 2);
        if (mid & 0x1) {
            if (intIp >= ipRange[mid - 1]) {
                if (intIp < ipRange[mid]) {
                    return true
                } else {
                    left = mid + 1;
                }
            } else {
                right = mid - 2
            }
        } else {
            if (intIp >= ipRange[mid]) {
                if (intIp < ipRange[mid + 1]) {
                    return true;
                } else {
                    left = mid + 2;
                }
            } else {
                right = mid - 1;
            }
        }
    } while (left < right);
    return false;
}

function getProxyFromIp4(strIp) {
    var intIp = convertIp4Address(strIp);
    if (isInIp4RangeList(subnetIp4RangeList, intIp)) {
        return direct;
    }
    // first part of ipv4 address is the index
    var index = intIp >>> 24;
    if (isInIp4RangeList(chnIp4RangeList[index], intIp)) {
        return direct;
    }
    return proxy;
}

function checkIp6(host) {
    // http://home.deds.nl/~aeron/regex/
    var re_ipv6 = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2})$/i;
    return re_ipv6.test(host)
}

function convertIp6Address(strIp) {
    // don't support ipv4-mapped ipv6 address
    var words = strIp.split(':');
    var pos = words.indexOf('');
    if (pos === 0)
        pos = words.indexOf('', pos + 1);
    var result = [0, 0, 0, 0];
    var len = words.length;
    var index = 0,  // index of ipv6
        wordi = 0;  // index of words
    do {
        if (pos === wordi) {
            index += 9 - len;
        } else {
            var word = words[wordi];
            if (word) {
                if (index & 0x1)
                    result[index >>> 1] += parseInt(word, 16);
                else
                    result[index >>> 1] = (parseInt(word, 16) << 16) >>> 0;
            }
            index++;
        }
        wordi++;
    } while (wordi < len);
    return result;
}

function compareIp6(a, b) {
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    if (a[1] > b[1]) return 1;
    if (a[1] < b[1]) return -1;
    if (a[2] > b[2]) return 1;
    if (a[2] < b[2]) return -1;
    if (a[3] > b[3]) return 1;
    if (a[3] < b[3]) return -1;
    return 0;
}

function isInIp6RangeList(ipRange, intIp) {
    if (ipRange.length === 0)
        return false;
    var left = 0, right = ipRange.length - 1;
    do {
        var mid = Math.floor((left + right) / 2);
        if (mid & 0x1) {
            if (compareIp6(intIp, ipRange[mid - 1]) >= 0) {
                if (compareIp6(intIp, ipRange[mid]) < 0) {
                    return true
                } else {
                    left = mid + 1;
                }
            } else {
                right = mid - 2
            }
        } else {
            if (compareIp6(intIp, ipRange[mid]) >= 0) {
                if (compareIp6(intIp, ipRange[mid + 1]) < 0) {
                    return true;
                } else {
                    left = mid + 2;
                }
            } else {
                right = mid - 1;
            }
        }
    } while (left < right);
    return false;
}

function getProxyFromIp6(strIp) {
    var intIp = convertIp6Address(strIp);
    if (isInIp6RangeList(subnetIp6RangeList, intIp)) {
        return direct;
    }
    // first part of ipv6 address is the index
    var index = intIp[0] >>> 16;
    if (isInIp6RangeList(chnIp6RangeList[index], intIp)) {
        return direct;
    }
    return proxy;
}

function isInDomains(domains, host) {
    var suffix;
    var pos = host.lastIndexOf('.');
    pos = host.lastIndexOf('.', pos - 1);
    while (true) {
        if (pos === -1) {
            return hasOwnProperty.call(domains, host);
        }
        suffix = host.substring(pos + 1);
        if (hasOwnProperty.call(domains, suffix)) {
            return true;
        }
        pos = host.lastIndexOf('.', pos - 1);
    }
}

function FindProxyForURL(url, host) {
    if (isPlainHostName(host)) return direct;

    if (checkIp4(host)) return getProxyFromIp4(host);
    if (checkIp6(host)) return getProxyFromIp6(host);

    if (isInDomains(gfwDomainList, host)) return proxy;

    var strIp = dnsResolve(host);
    if (strIp) {
        if (checkIp4(strIp)) return getProxyFromIp4(strIp);
        if (checkIp6(strIp)) return getProxyFromIp6(strIp);
    }
    return proxy;
}
