var test_cases = [
    // subnet ips
    0, "127.0.0.1",
    0, "::1",
    0, "fec0::1",
    // plain hosts
    0, "localhost",
    // white domains
    0, "qq.com",
    0, "im.qq.com",
    0, "www.imqq.com",
    // ipv6 domains
    0, "ipv6.taobao.com",
    0, "ipv6.baidu.com",
    // gfw domains
    1, "google.com",
    // gfw ips
    1, "2607:f8b0:4002:c02::71",
    // unknown domains
    1, "qwq.com",
    1, "a.b.c.d.com"
];

function isPlainHostName(host) {
    if (host.toLowerCase() === 'localhost')
        return true;
    return false;
}

function dnsResolve(host) {
    // console.log("dnsresolve: "+ host);
    switch (host) {
        case "ipv6.taobao.com":
            return "2001:da8:20d:7042::f1";
        case "ipv6.baidu.com":
            return "2400:da00:2::29";
        case "qq.com":
            return "123.151.137.18";
        case "www.imqq.com":
            return "101.226.211.229";
        case "im.qq.com":
            return "14.215.138.22";
        default:
            return null;
    }
}

function isInNet(ip, ipstart, ipmask) {
    return false;
}

function shExpMatch(a, b) {
    return false;
}

function test(url, host) {
    ret = FindProxyForURL(url, host);
    if (typeof (direct) == "undefined") {
        if (ret.toLowerCase().indexOf("direct") >= 0) {
            return 0;
        }
        return 1;
    } else if (ret === direct)
        return 0;
    else
        return 1;
}

function output_result(out_obj) {
    output.value = "";
    for (var i = 0; i < test_cases.length; i += 2) {
        var test_case = test_cases[i + 1];
        var test_result = test(test_case, test_case);
        var out_line = "" + test_result + " " + test_case + " ";
        if (test_result === test_cases[i]) {
            out_line = out_line + "Pass";
        } else {
            out_line = out_line + "NOT Pass";
        }
        out_obj.value = out_obj.value + out_line + "\n";
    }
    test_result = {};
    for (i = 1, len = test_cases.length; i < len; i += 2) {
        var start = new Date();
        for (var j = 0; j < 100000; ++j) {
            test_case = test_cases[i];
            // console.log(test_case);
            test(test_case, test_case);
        }
        var end = new Date();
        test_result[test_case] = end - start;
    }
    var result_string = '';
    var average_time = 0;
    for (var hostname in test_result) {
        average_time += test_result[hostname];
        result_string += hostname + ": " + test_result[hostname] + "ms in 100,000 tests\n"
    }
    result_string += "average: " + Math.floor(average_time / (test_cases.length / 2)) + "ms in 100,000 tests\n";
    alert(result_string);
}

function begin_test() {
    var output = document.getElementById("output");
    output_result(output);
}

function test_one() {
    var input = document.getElementById("input");
    var result_obj = document.getElementById("result");
    result = test(input.value, input.value);
    if (result === 1)
        result_obj.value = "Proxy";
    else
        result_obj.value = "Direct";
}
