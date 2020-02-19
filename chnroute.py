#!/usr/bin/python
# -*- coding: utf-8 -*-
import base64
import copy
import json
import logging
import re
import urllib.parse as urlparse
from argparse import ArgumentParser

import urllib3

gfwlist_url = 'https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt'
chnroute_url = 'https://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest'
tlds_url = 'https://publicsuffix.org/list/public_suffix_list.dat'


def parse_args():
    parser = ArgumentParser()
    parser.add_argument('-o', '--output', dest='output', default='chnroute.pac',
                        help='path to output pac', metavar='PAC')
    parser.add_argument('-p', '--proxy', dest='proxy', default='SOCKS5 127.0.0.1:1080; SOCKS 127.0.0.1:1080;',
                        help='the proxy parameter in the pac file. for example, '
                             '"SOCKS5 127.0.0.1:1080; SOCKS 127.0.0.1:1080;"',
                        metavar='PROXY')
    return parser.parse_args()


def get_file_data(path):
    # must be a text file
    with open(path, 'r', encoding='utf8') as f:
        content = f.read()
    return content


def get_web_data(url):
    # must be a text website
    http = urllib3.PoolManager()
    response = http.request(
        'GET', url,
        timeout=urllib3.Timeout(connect=3.0, read=10.0)
    )
    content = response.data.decode('utf-8')
    return content


def decode_gfwlist(content):
    # decode base64 if have to
    if '.' in content:
        return content
    content = base64.b64decode(content)
    return content.decode('utf-8')


def get_hostname(url_path):
    try:
        url = 'http://' + url_path
        hostname = urlparse.urlparse(url).hostname
        # convert to punycode
        return hostname.encode('idna').decode('utf-8')
    except Exception as e:
        logging.error(e)


def parse_gfwlist(content):
    domains = set()
    for line in content.splitlines(False):
        if not line:
            # ignore null or ''
            continue
        if line.startswith('!'):
            # ignore comment
            continue
        if line.startswith('['):
            # ignore [AutoProxy x.x.x]
            continue
        if line.startswith('@'):
            # ignore white list
            continue
        if line.startswith('/'):
            # support limit regex
            if line.find('*') >= 0:
                continue
            if line.find('[') >= 0:
                continue
            if line.find('|') >= 0:
                continue
            if line.find('(') >= 0:
                continue
            line = re.findall('(?<=/).*(?=/)', line)[0]
            line = line.replace('\\/', '/')
            line = line.replace('\\.', '.')
            line = re.sub('.\\?', '', line)
        line = urlparse.unquote(line, 'utf-8')
        if line.find('.*') >= 0:
            # can't parse '.*'
            continue
        # prepare line
        line = re.sub('(?<=\\w)\\*(?=\\w)', '/', line)
        line = line.replace('*', '')
        line = line.lstrip('|')
        line = line.lstrip('http://')
        line = line.lstrip('https://')
        line = line.lstrip('.')
        hostname = get_hostname(line)
        if hostname:
            domains.add(hostname)
    return reduce_domains(domains)


def parse_tlds(content):
    tlds = set()
    for line in content.splitlines(False):
        if not line:
            # ignore null or ''
            continue
        if line.startswith('//'):
            # ignore comment
            continue
        tld = line.encode('idna').decode('utf-8')
        tlds.add(tld)
    return tlds


def get_domain_sld(domain, tlds):
    # get second level domain from a domain, if domain is not valid, return None
    domain_parts = domain.split('.')
    domain_len = len(domain_parts)
    sld = None
    for i in range(domain_len, 0, -1):
        root_domain = '.'.join(domain_parts[i - 1:])
        if i == domain_len and root_domain not in tlds:
            break
        sld = root_domain
        if root_domain not in tlds:
            break
    return sld


def reduce_domains(domains):
    # reduce 'www.google.com' to 'google.com'
    print('Downloading tlds from %s' % tlds_url)
    tlds_content = get_web_data(tlds_url)
    tlds = parse_tlds(tlds_content)
    new_domains = set()
    for domain in domains:
        sld = get_domain_sld(domain, tlds)
        if sld:
            new_domains.add(sld)
    return new_domains


def convert_ip4_address(str_ip):
    bytes = str_ip.split('.')
    result = (int(bytes[0]) << 24) | \
             (int(bytes[1]) << 16) | \
             (int(bytes[2]) << 8) | \
             (int(bytes[3]))
    return result


def parse_ip4_chnroute(chnroute):
    pattern = re.compile(".*?\\|CN\\|ipv4\\|(.*?)\\|(.*?)\\|.*")
    list = []
    for i in range(0, 256):
        list.append([])
    for line in chnroute.splitlines(False):
        matcher = pattern.match(line)
        if matcher:
            start = convert_ip4_address(matcher.group(1))
            value = int(matcher.group(2))
            index = start >> 24
            sub_list = list[index]
            if sub_list and sub_list[-1] == start:
                sub_list.pop()
                sub_list.append(start + value)
            else:
                sub_list.append(start)
                sub_list.append(start + value)
    return list


def convert_ip6_address(str_ip):
    # don't support ipv4-mapped ipv6 address
    words = str_ip.split(':')
    pos = words.index('')
    if pos == 0:
        pos = words.index('', pos + 1)
    result = [0, 0, 0, 0]
    length = len(words)
    index = 0  # index of ipv6
    wordi = 0  # index of words
    while wordi < length:
        if pos == wordi:
            index += 9 - length
        else:
            word = words[wordi]
            if word:
                if index & 0x1:
                    result[index >> 1] += int(word, 16)
                else:
                    result[index >> 1] = int(word, 16) << 16
            index += 1
        wordi += 1
    return result


def parse_ip6_chnroute(chnroute):
    pattern = re.compile(".*?\\|CN\\|ipv6\\|(.*?)\\|(.*?)\\|.*")
    list = []
    for i in range(0, 0x10000):
        list.append([])
    for line in chnroute.splitlines(False):
        matcher = pattern.match(line)
        if matcher:
            start = convert_ip6_address(matcher.group(1))
            value = int(matcher.group(2))
            # generate end ipv6
            word_index = (value - 1) // 32
            word_cidr = (value - 1) % 32 + 1
            end = copy.copy(start)
            end[word_index] += 1 << (32 - word_cidr)
            # processing carry
            for i in range(word_index, 0, -1):
                d = (end[i] >> 32)
                if d:
                    end[i] &= 0xffffffff
                    end[i - 1] += d
            # end[0] &= 0xffffffff
            index = start[0] >> 16
            sub_list = list[index]
            if sub_list and sub_list[-1] == start:
                sub_list.pop()
                sub_list.append(end)
            else:
                sub_list.append(start)
                sub_list.append(end)
    return list


def generate_pac(gfwlist, ip4_chnroute, ip6_chnroute, proxy):
    # render the pac file
    proxy_content = get_file_data('resources/chnroute.pac')
    domain_dict = {}
    for domain in gfwlist:
        domain_dict[domain] = 1
    proxy_content = proxy_content.replace('__PROXY__', json.dumps(proxy))
    proxy_content = proxy_content.replace('__DOMAINS__', json.dumps(domain_dict, indent=0))
    proxy_content = proxy_content.replace('__IPV4LIST__', json.dumps(ip4_chnroute))
    proxy_content = proxy_content.replace('__IPV6LIST__', json.dumps(ip6_chnroute))
    return proxy_content


def main():
    args = parse_args()

    print('Downloading gfwlist from %s' % gfwlist_url)
    gfwlist_content = get_web_data(gfwlist_url)
    print('Downloading chnroute from %s' % chnroute_url)
    chnroute_content = get_web_data(chnroute_url)

    print('Parsing gfwlist ...')
    gfwlist_content = decode_gfwlist(gfwlist_content)
    gfwlist = parse_gfwlist(gfwlist_content)

    print('Parsing chnroute ...')
    ip4_chnroute = parse_ip4_chnroute(chnroute_content)
    ip6_chnroute = parse_ip6_chnroute(chnroute_content)

    print('Generating PAC ...')
    pac_content = generate_pac(gfwlist, ip4_chnroute, ip6_chnroute, args.proxy)
    with open(args.output, 'w') as file_obj:
        file_obj.write(pac_content)
    print('Done.')


if __name__ == '__main__':
    main()
