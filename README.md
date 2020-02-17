# Chnroute2PAC

[![Build Status](https://travis-ci.org/fanck0605/chnroute2pac.svg?branch=master)](https://travis-ci.org/fanck0605/chnroute2pac)

Generate fast PAC file from chnroute, which contains chinese IP(include IPv6)
that can directly access. If some IP are not included, it will access through
proxy. The PAC script solves DNS pollution by gfwlist, this means all request
will be bypass correctly.

If you use this PAC file, you may need a proxy which not billing with flow.

The chnroute come from [http://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest](http://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest)

The gfwlist come from [https://github.com/gfwlist/gfwlist](https://github.com/gfwlist/gfwlist)

This project location: [https://github.com/fanck0605/chnroute2pac](https://github.com/fanck0605/chnroute2pac)

## How to use

Switch to [`gh-pages`](https://github.com/fanck0605/chnroute2pac/tree/gh-pages)
branch to download latest pac file

Download the [`chnroute.pac`](https://raw.githubusercontent.com/fanck0605/chnroute2pac/gh-pages/chnroute.pac),
edit the server IP and the type of proxy. After that change your browser's config,
point to `chnroute.pac`.

    // Change the type of proxy, it also can be 'HTTPS'
    // Make sure to change both SOCKS5 and SOCKS
    var proxy = "SOCKS5 127.0.0.1:1080; SOCKS 127.0.0.1:1080;",

### Use script to generate the PAC file

Excute command `python3 chnroute.py --output chnroute.pac`, `chnroute.pac` will
updated.

## PAC performance (100,000 repeat)

    Test chnroute.pac on Chrome
    avg: 70 ms
    ipv6: 150 ms

## Based on

[breakwa11 gfw_whitelist](https://github.com/breakwa11/gfw_whitelist)  
[R0uter gfw_domain_whitelist](https://github.com/R0uter/gfw_domain_whitelist)  
[clowwindy gfwlist2pac](https://github.com/clowwindy/gfwlist2pac)

## MIT License (MIT)

The MIT License (MIT)

Copyright (c) 2020 None

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
