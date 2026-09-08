#!/usr/bin/env python3
import os
import re
import base64
from urllib import request
from http.client import HTTPResponse
from typing import Optional, cast
from pathlib import Path
from collections import deque

TYPE_MAP: dict[str, str] = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "jfif": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp"
}

def createStandardizedRequest(url: str) -> request.Request:
    return request.Request(
        url=url,
        headers={
            "User-Agent": "HTMLExpander",
            "Accept": ", ".join(sorted(set(TYPE_MAP.values())))
        }
    )

def getMimeTypeFromFilename(filename: str) -> Optional[str]:
    sp = filename.split(".")
    return TYPE_MAP.get(sp[-1])

def searchForParamInTag(fullTag: str, searchedKey: str, keyValueRequirements: dict[str, str] = {}) -> Optional[str]:
    paramPattern = re.compile(r"([a-z]+)=['\"]([a-zA-Z0-9.:\/-_\?=%&]+)['\"]")
    val: Optional[str] = None

    for param in paramPattern.finditer(fullTag):
        if param.group(1) == searchedKey: val = param.group(2)
        if param.group(1) in keyValueRequirements.keys():
            if keyValueRequirements[param.group(1)] != param.group(2): return None

    return val

def findMainJS(htmlSource: str) -> Optional[Path]:
    pattern = re.compile(r"<script .*>.*<\/script>")
    scriptTags = pattern.findall(htmlSource)
    assert len(scriptTags) == 1

    if not (pathstring := searchForParamInTag(scriptTags[0], "src")):
        return None
    
    if (path := Path(pathstring)).is_file():
        return path
            
    return None

def findMainCSS(htmlSource: str) -> Optional[Path]:
    pattern = re.compile(r"<link .*>")
    links = pattern.findall(htmlSource)
    assert len(links) == 1

    if not (pathstring := searchForParamInTag(links[0], "href", {"rel": "stylesheet"})):
        return None
    
    if (path := Path(pathstring)).is_file():
        return path
            
    return None

def findFirstEither(string: str, expr1: str, expr2: str, start: int = 0) -> int:
    found1 = string.find(expr1, start)
    found2 = string.find(expr2, start)

    validIndices = [idx for idx in (found1, found2) if idx != -1]

    if not validIndices:
        return -1
    
    return min(validIndices)

def removeRange(string: str, startIdx: int, endIdx: int) -> str:
    return string[:startIdx] + string[endIdx:]

def strFromRange(string: str, startIdx: int, endIdx: int) -> str:
    return string[startIdx:endIdx]

def removeSingleLineComments(source: str) -> str:
    return re.sub(r"//[^\r\n]*", "", source)

def removeMultiLineComments(source: str) -> str:
    lastIndex = 0
    commentStack: deque[int] = deque()

    while (idx := findFirstEither(source, "/*", "*/", lastIndex)) != -1:
        if(source[idx] == "/"): 
            commentStack.append(idx)
            lastIndex = idx + 2
        else:
            startIdx = commentStack.pop()
            source = removeRange(source, startIdx, idx + 2)
            lastIndex = startIdx

    return source

def removeExport(source: str) -> str:
    return source.replace("export ", "")

processedJS: set[Path] = set()
def resolveAndClearDependencies(source: str, path: Path) -> tuple[str, list[Path]]:
    if path in processedJS:
        raise Exception(f"File {path}is a circular dependency")
    
    processedJS.add(path)
    dirOfFile = path.parent
    paths: list[Path] = []
    pattern = re.compile(r"import\s+?{(?:\s+?[a-zA-Z0-9$_]+,?)+\s+?}\s+?from\s+?[\'\"](\.\/[a-zA-Z0-9$_\/]+)(?:\.js)?[\'\"];")

    for match in pattern.finditer(source):
        filename = match.group(1)
        filepath = dirOfFile / Path(f"{filename}.js")
        if not filepath.is_file():
            print(f"{filepath} is not a file")
            raise Exception("Bad module")
        
        paths.append(filepath)
        source = source.replace(match.group(0), "")

    return source, paths

def expandImages(htmlSource: str, path: Path) -> str:
    print("Expanding images...")
    pattern = re.compile(r"<img .*></img>")
    
    for link in pattern.finditer(htmlSource):
        if not (pathstring := searchForParamInTag(link.group(0), "src")):
            print(f"ERROR: Image tag {link.group(0)} doesn't have src!")
            continue

        if (path := Path(pathstring)).is_file():
            imgBytes = path.read_bytes()
            if not (ftype := getMimeTypeFromFilename(path.name)):
                continue

            replacement = f"data:{ftype};base64,{base64.b64encode(imgBytes).decode()}"
            htmlSource = htmlSource.replace(pathstring, replacement)

        elif pathstring.startswith(("http", "https")):
            with request.urlopen(createStandardizedRequest(pathstring), timeout=30) as resp:
                response = cast(HTTPResponse, resp)
                if (contentType := response.headers.get_content_type()) not in set(TYPE_MAP.values()):
                    print(f"ERROR: Invalid content response from {pathstring}")
                    continue
                
                replacement = f"data:{contentType};base64,{base64.b64encode(response.read()).decode()}"
                htmlSource = htmlSource.replace(pathstring, replacement)

        else:
            print(f"ERROR: Path {pathstring} is neither a file or a URL")
            
    return htmlSource

def removeCommand(source: str, command: str) -> str:
    lastIndex: int = 0
    while (idx := source.find(command, lastIndex)) != -1:
        if(lineEndIdx := source.find("\n", idx)) == -1:
            lineEndIdx = len(source)
        
        source = removeRange(source, idx, lineEndIdx + 1)
        lastIndex = idx

    return source

def removeConsoleLog(source: str) -> str:
    return removeCommand(source, "console.log")

def replaceWithInlineJS(source: str, inlineJS: str, jsFilename: str) -> str:
    startIdx: int = 0
    while (tagStartIdx := source.find("<script ", startIdx)) != -1:
        if (tagEndIdx := source.find("</script>", tagStartIdx)) == -1:
            raise Exception("Malformed HTML")
        
        tagEndIdx += len("</script>")
        tag = strFromRange(source, tagStartIdx, tagEndIdx)
        if tag.find(f"src=\"{jsFilename}\"") != -1:
            source = source.replace(tag, inlineJS)
            return source
        
    return source

def replaceWithInlineCSS(source: str, inlineCSS: str, cssFilename: str) -> str:
    startIdx: int = 0
    while (tagStartIdx := source.find("<link ", startIdx)) != -1:
        if (tagEndIdx := source.find(">", tagStartIdx)) == -1:
            raise Exception("Malformed HTML")
        
        tagEndIdx += len(">")
        tag = strFromRange(source, tagStartIdx, tagEndIdx)
        if tag.find(f"href=\"{cssFilename}\"") != -1:
            source = source.replace(tag, inlineCSS)
            return source
    
    return source

def compact(source: str) -> str:
    l = source.splitlines()
    withoutEmptyLines = [elem + os.linesep for elem in l if len(elem.strip()) > 0]
    return "".join(withoutEmptyLines)

def processJS(mainFile: Path) -> str:
    jointBuf = ""
    
    print(f"Processing {mainFile}...")
    with open(mainFile, "r") as f:
        filebuf = f.read()
    
    filebuf = removeSingleLineComments(filebuf)
    filebuf = removeMultiLineComments(filebuf)
    filebuf = removeConsoleLog(filebuf)
    filebuf = removeExport(filebuf)
    filebuf, dependencies = resolveAndClearDependencies(filebuf, mainFile)

    for dependency in dependencies:
        out = processJS(dependency)
        jointBuf += out

    jointBuf += filebuf
    jointBuf += os.linesep

    return jointBuf

def processCSS(file: Path) -> str:
    with open(file) as f:
        cssSource = f.read()

    cssSource = removeMultiLineComments(cssSource)
    return cssSource
        
def JSAsHTMLElement(source: str) -> str:
    return f"<script>\n{source}</script>"

def CSSAsHTMLElement(source: str) -> str:
    return f"<style>\n{source}</style>"

def main() -> None:
    currentPath = Path(__file__).parent
    htmlPath = currentPath / "index.html"

    try:
        htmlSource = htmlPath.read_text()
    except FileNotFoundError:
        print("ERROR: Could not find index.html!")
        return

    if not (mainJS := findMainJS(htmlSource)):
        print("ERROR: Main JS not found in index.html!")
        exit(1)

    if not (mainCSS := findMainCSS(htmlSource)):
        print("ERROR: Main CSS not found in index.html!")
        exit(1)

    amalgamated = processJS(mainJS)
    cssSource = processCSS(mainCSS)

    htmlSource = expandImages(htmlSource, htmlPath)
    htmlSource = replaceWithInlineJS(htmlSource, JSAsHTMLElement(amalgamated), mainJS.name)
    htmlSource = replaceWithInlineCSS(htmlSource, CSSAsHTMLElement(cssSource), mainCSS.name)
    htmlSource = compact(htmlSource)

    outPath = currentPath / "dist" / htmlPath.name
    outPath.parent.mkdir(parents=True, exist_ok=True)
    outPath.write_text(htmlSource)

if __name__ == "__main__": 
    main()