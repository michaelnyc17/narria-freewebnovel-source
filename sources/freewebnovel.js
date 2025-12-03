const NovelSource = {
    baseUrl: "https://freewebnovel.com",
    
    /**
     * Extract text between two strings
     */
    _extractBetween: function(html, start, end) {
        if (!html) return "";
        const startIdx = html.indexOf(start);
        if (startIdx === -1) return "";
        const contentStart = startIdx + start.length;
        const endIdx = html.indexOf(end, contentStart);
        if (endIdx === -1) return "";
        return html.substring(contentStart, endIdx).trim();
    },
    
    /**
     * Clean HTML text
     */
    _cleanText: function(text) {
        if (!text) return "";
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    },
    
    /**
     * Build full URL
     */
    _buildUrl: function(path) {
        if (!path) return this.baseUrl;
        if (path.indexOf('http') === 0) return path;
        if (path.indexOf('/') === 0) return this.baseUrl + path;
        return this.baseUrl + '/' + path;
    },
    
    /**
     * Get popular novels from latest-release page
     */
    getPopularNovels: function(page) {
        try {
            log("Getting popular novels, page: " + page);
            
            var url = this._buildUrl("/sort/latest-release");
            var response = fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Narria/1.0 (iOS)"
                }
            });
            
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            
            var html = response.text;
            var novels = [];
            var seen = {};
            
            // Find all novel links with title attributes
            var startPos = 0;
            while (startPos < html.length && novels.length < 20) {
                var linkStart = html.indexOf('href="/novel/', startPos);
                if (linkStart === -1) break;
                
                var linkEnd = html.indexOf('"', linkStart + 6);
                if (linkEnd === -1) break;
                
                var novelPath = html.substring(linkStart + 6, linkEnd);
                var novelId = novelPath.replace('/novel/', '');
                
                if (seen[novelId]) {
                    startPos = linkEnd;
                    continue;
                }
                seen[novelId] = true;
                
                // Extract title
                var titleStart = html.indexOf('title="', linkEnd);
                var title = "";
                if (titleStart !== -1 && titleStart < linkEnd + 200) {
                    var titleEnd = html.indexOf('"', titleStart + 7);
                    if (titleEnd !== -1) {
                        title = html.substring(titleStart + 7, titleEnd);
                        title = this._cleanText(title);
                    }
                }
                
                if (!title) {
                    title = novelId.replace(/-/g, ' ');
                }
                
                // Try to find cover image
                var contextStart = Math.max(0, linkStart - 500);
                var contextEnd = Math.min(html.length, linkStart + 500);
                var context = html.substring(contextStart, contextEnd);
                
                var imgStart = context.indexOf('src="');
                var coverUrl = "";
                if (imgStart !== -1) {
                    var imgEnd = context.indexOf('"', imgStart + 5);
                    if (imgEnd !== -1) {
                        coverUrl = context.substring(imgStart + 5, imgEnd);
                        if (coverUrl.indexOf('http') !== 0) {
                            coverUrl = this._buildUrl(coverUrl);
                        }
                    }
                }
                
                novels.push({
                    novelId: novelId,
                    title: title,
                    author: "Unknown",
                    description: "",
                    coverUrl: coverUrl
                });
                
                log("Added novel: " + title);
                startPos = linkEnd;
            }
            
            if (novels.length === 0) {
                throw new Error("No novels found");
            }
            
            log("Returning " + novels.length + " novels");
            return novels;
            
        } catch (e) {
            log("Error in getPopularNovels: " + e.message);
            throw e;
        }
    },
    
    /**
     * Search novels by query
     */
    searchNovels: function(query, page) {
        try {
            log("Searching for: " + query);
            
            var searchUrl = this._buildUrl("/search/" + encodeURIComponent(query));
            var response = fetch(searchUrl, {
                method: "GET",
                headers: {
                    "User-Agent": "Narria/1.0 (iOS)"
                }
            });
            
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            
            var html = response.text;
            var novels = [];
            var seen = {};
            
            var startPos = 0;
            while (startPos < html.length && novels.length < 20) {
                var linkStart = html.indexOf('href="/novel/', startPos);
                if (linkStart === -1) break;
                
                var linkEnd = html.indexOf('"', linkStart + 6);
                if (linkEnd === -1) break;
                
                var novelPath = html.substring(linkStart + 6, linkEnd);
                var novelId = novelPath.replace('/novel/', '');
                
                if (seen[novelId]) {
                    startPos = linkEnd;
                    continue;
                }
                seen[novelId] = true;
                
                var titleStart = html.indexOf('title="', linkEnd);
                var title = "";
                if (titleStart !== -1 && titleStart < linkEnd + 200) {
                    var titleEnd = html.indexOf('"', titleStart + 7);
                    if (titleEnd !== -1) {
                        title = html.substring(titleStart + 7, titleEnd);
                        title = this._cleanText(title);
                    }
                }
                
                if (!title) {
                    title = novelId.replace(/-/g, ' ');
                }
                
                var contextStart = Math.max(0, linkStart - 500);
                var contextEnd = Math.min(html.length, linkStart + 500);
                var context = html.substring(contextStart, contextEnd);
                
                var imgStart = context.indexOf('src="');
                var coverUrl = "";
                if (imgStart !== -1) {
                    var imgEnd = context.indexOf('"', imgStart + 5);
                    if (imgEnd !== -1) {
                        coverUrl = context.substring(imgStart + 5, imgEnd);
                        if (coverUrl.indexOf('http') !== 0) {
                            coverUrl = this._buildUrl(coverUrl);
                        }
                    }
                }
                
                novels.push({
                    novelId: novelId,
                    title: title,
                    author: "Unknown",
                    description: "",
                    coverUrl: coverUrl
                });
                
                startPos = linkEnd;
            }
            
            log("Found " + novels.length + " search results");
            return novels;
            
        } catch (e) {
            log("Error in searchNovels: " + e.message);
            throw e;
        }
    },
    
    /**
     * Get chapter list for a novel
     */
    getChapterList: function(novelId) {
        try {
            log("Getting chapters for: " + novelId);
            
            var url = this._buildUrl("/novel/" + novelId);
            var response = fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Narria/1.0 (iOS)"
                }
            });
            
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            
            var html = response.text;
            var chapters = [];
            var seen = {};
            var index = 0;
            
            // Look for chapter links
            var searchPattern = '/novel/' + novelId + '/';
            var startPos = 0;
            
            while (startPos < html.length) {
                var chapterLinkStart = html.indexOf(searchPattern, startPos);
                if (chapterLinkStart === -1) break;
                
                var chapterLinkEnd = html.indexOf('"', chapterLinkStart);
                if (chapterLinkEnd === -1) break;
                
                var fullPath = html.substring(chapterLinkStart, chapterLinkEnd);
                var chapterIdPart = fullPath.replace('/novel/' + novelId + '/', '');
                
                if (seen[chapterIdPart] || !chapterIdPart || chapterIdPart === novelId) {
                    startPos = chapterLinkEnd;
                    continue;
                }
                seen[chapterIdPart] = true;
                
                // Try to extract chapter title
                var titleStart = html.indexOf('title="', chapterLinkEnd);
                var chapterTitle = "";
                if (titleStart !== -1 && titleStart < chapterLinkEnd + 100) {
                    var titleEnd = html.indexOf('"', titleStart + 7);
                    if (titleEnd !== -1) {
                        chapterTitle = html.substring(titleStart + 7, titleEnd);
                        chapterTitle = this._cleanText(chapterTitle);
                    }
                }
                
                if (!chapterTitle) {
                    chapterTitle = chapterIdPart.replace(/-/g, ' ');
                }
                
                chapters.push({
                    chapterId: novelId + "/" + chapterIdPart,
                    title: chapterTitle,
                    index: index
                });
                
                index++;
                startPos = chapterLinkEnd;
            }
            
            if (chapters.length === 0) {
                log("No chapters found, creating fallback");
                chapters.push({
                    chapterId: novelId + "/chapter-1",
                    title: "Chapter 1",
                    index: 0
                });
            }
            
            log("Found " + chapters.length + " chapters");
            return chapters;
            
        } catch (e) {
            log("Error in getChapterList: " + e.message);
            throw e;
        }
    },
    
    /**
     * Get chapter content as HTML
     */
    getChapterContent: function(chapterId) {
        try {
            log("Getting content for: " + chapterId);
            
            var url = this._buildUrl("/novel/" + chapterId);
            var response = fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Narria/1.0 (iOS)"
                }
            });
            
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            
            var html = response.text;
            
            // Extract content from <div id="article">
            var articleStart = html.indexOf('<div id="article">');
            var content = "";
            
            if (articleStart !== -1) {
                var articleEnd = html.indexOf('</div>', articleStart);
                if (articleEnd !== -1) {
                    content = html.substring(articleStart + 18, articleEnd);
                }
            }
            
            // Fallback: look for paragraphs
            if (!content || content.length < 100) {
                log("Using fallback paragraph extraction");
                var paragraphs = [];
                var searchPos = 0;
                
                while (searchPos < html.length) {
                    var pStart = html.indexOf('<p>', searchPos);
                    if (pStart === -1) break;
                    
                    var pEnd = html.indexOf('</p>', pStart);
                    if (pEnd === -1) break;
                    
                    var pContent = html.substring(pStart + 3, pEnd);
                    pContent = this._cleanText(pContent);
                    
                    if (pContent.length > 20) {
                        paragraphs.push('<p>' + pContent + '</p>');
                    }
                    
                    searchPos = pEnd + 4;
                    
                    if (paragraphs.length > 100) break;
                }
                
                if (paragraphs.length > 0) {
                    content = paragraphs.join('\n');
                }
            }
            
            if (!content || content.length < 50) {
                log("WARNING: Could not extract content");
                return "<div style='padding: 20px;'><p><strong>Could not extract chapter content.</strong></p><p>Chapter: " + chapterId + "</p></div>";
            }
            
            // Clean content
            content = content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            
            // Wrap in styled div
            var styledHtml = '<div style="font-family: Georgia, serif; font-size: 18px; line-height: 1.8; padding: 20px; color: #333;">' + content + '</div>';
            
            log("Content extracted: " + content.length + " chars");
            
            return styledHtml;
            
        } catch (e) {
            log("Error in getChapterContent: " + e.message);
            return "<div style='padding: 20px;'><p><strong>Error:</strong> " + e.message + "</p></div>";
        }
    }
};