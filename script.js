document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables ---
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const html = document.documentElement;
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const tocNavContainer = document.getElementById('toc-nav-container');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('toc-nav');
    const overlay = document.getElementById('mobile-menu-overlay');
    const body = document.body;
    const mainContent = document.getElementById('main-content');
    
    let searchIndex = [];
    let allHeadings = [];

    // --- Mobile Menu ---
    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        body.classList.toggle('menu-open');
    };

    hamburgerBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // --- Theme Toggler ---
    const applyTheme = (theme) => {
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        sunIcon.style.display = theme === 'dark' ? 'none' : 'block';
        moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    };

    // --- Content Rendering ---
    const renderContent = async () => {
        try {
            const response = await fetch('content.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            mainContent.innerHTML = ''; // Clear existing content

            data.sections.forEach(sectionData => {
                const sectionEl = document.createElement('section');
                sectionEl.id = sectionData.id;

                const h2 = document.createElement('h2');
                h2.textContent = sectionData.title;
                h2.id = sectionData.id; // Assign ID for scrollspy
                sectionEl.appendChild(h2);

                sectionData.topics.forEach(topicData => {
                    const topicBlock = document.createElement('div');
                    topicBlock.className = 'topic-block';

                    if (topicData.title) {
                        const h3 = document.createElement('h3');
                        h3.id = topicData.id;
                        if(topicData.icon) h3.innerHTML += topicData.icon;
                        const titleText = document.createElement('span');
                        titleText.textContent = topicData.title;
                        h3.appendChild(titleText);
                        topicBlock.appendChild(h3);
                    }
                    
                    if (topicData.content.description) {
                        const p = document.createElement('p');
                        p.innerHTML = topicData.content.description;
                        topicBlock.appendChild(p);
                    }

                    if (topicData.content.code) {
                        const codeBlock = document.createElement('div');
                        codeBlock.className = 'code-block';
                        
                        const pre = document.createElement('pre');
                        pre.innerHTML = topicData.content.code;

                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'copy-btn';
                        copyBtn.textContent = 'Copy';
                        
                        codeBlock.appendChild(copyBtn);
                        codeBlock.appendChild(pre);
                        topicBlock.appendChild(codeBlock);
                    }
                    sectionEl.appendChild(topicBlock);
                });
                mainContent.appendChild(sectionEl);
            });
            
            initializePageFunctions();

        } catch (error) {
            mainContent.innerHTML = `<p style="color: red;">Failed to load page content: ${error.message}</p>`;
            console.error('Error fetching or rendering content:', error);
        }
    };
    
    const initializePageFunctions = () => {
        allHeadings = Array.from(document.querySelectorAll('main h2, main h3'));
        
        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const pre = e.currentTarget.closest('.code-block').querySelector('pre');
                navigator.clipboard.writeText(pre.innerText).then(() => {
                    button.innerText = 'Copied!';
                    setTimeout(() => { button.innerText = 'Copy'; }, 2000);
                });
            });
        });

        buildSearchIndex();
        updateTocNav();
        setupObservers();
    };

    const buildSearchIndex = () => {
        searchIndex = [];
        document.querySelectorAll('main section').forEach(section => {
            const category = section.querySelector('h2').textContent.trim();
            section.querySelectorAll('.topic-block').forEach(topic => {
                const h3 = topic.querySelector('h3');
                const p = topic.querySelector('p');
                const code = topic.querySelector('pre');
                if (h3) {
                     searchIndex.push({
                        id: h3.id,
                        title: h3.textContent.trim(),
                        category: category,
                        description: p ? p.textContent.trim() : '',
                        code: code ? code.innerText.trim() : ''
                    });
                }
            });
        });
    };

    const performSearch = (query) => {
        if (!query || query.trim() === '') {
            searchResultsContainer.style.display = 'none';
            return;
        }
        const lowerCaseQuery = query.toLowerCase();
        const results = searchIndex.filter(item => 
            item.title.toLowerCase().includes(lowerCaseQuery) ||
            item.description.toLowerCase().includes(lowerCaseQuery) ||
            item.code.toLowerCase().includes(lowerCaseQuery)
        );
        
        searchResultsContainer.innerHTML = '';
        if (results.length > 0) {
            results.slice(0, 10).forEach(result => {
                const a = document.createElement('a');
                a.href = `#${result.id}`;
                
                let contentSource = result.description;
                if (result.code.toLowerCase().includes(lowerCaseQuery)) contentSource = result.code;
                if (result.title.toLowerCase().includes(lowerCaseQuery)) contentSource = result.description;

                const queryIndex = contentSource.toLowerCase().indexOf(lowerCaseQuery);
                const start = Math.max(0, queryIndex - 20);
                const end = Math.min(contentSource.length, queryIndex + query.length + 30);
                let snippet = (start > 0 ? '...' : '') + contentSource.substring(start, end).trim() + (end < contentSource.length ? '...' : '');
                snippet = snippet.replace(new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), `<mark>${query}</mark>`);

                a.innerHTML = `${result.title} <span class="path">${result.category} > ${result.title}</span> <span class="snippet">${snippet}</span>`;
                a.addEventListener('click', (e) => {
                     e.preventDefault();
                     const targetElement = document.querySelector(a.getAttribute('href'));
                     if (targetElement) {
                         const headerOffset = 70;
                         const elementPosition = targetElement.getBoundingClientRect().top;
                         const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                         window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                     }
                    searchResultsContainer.style.display = 'none';
                    searchInput.value = '';
                });
                searchResultsContainer.appendChild(a);
            });
            searchResultsContainer.style.display = 'block';
        } else {
            searchResultsContainer.style.display = 'none';
        }
    };
    
    searchInput.addEventListener('input', (e) => performSearch(e.target.value));
    searchInput.addEventListener('focus', (e) => performSearch(e.target.value));
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) searchResultsContainer.style.display = 'none';
    });

    const updateTocNav = () => {
        tocNavContainer.innerHTML = '';
        allHeadings.forEach(h => {
             const a = document.createElement('a');
             a.href = `#${h.id}`;
             a.textContent = h.textContent.trim();
             if (h.tagName === 'H2') a.classList.add('toc-category');
             else a.style.marginLeft = '1rem';
             
             a.addEventListener('click', (e) => {
                 e.preventDefault();
                 if (mobileMenu.classList.contains('active')) {
                     toggleMenu();
                 }
                 const targetElement = document.querySelector(a.getAttribute('href'));
                 if (targetElement) {
                     const headerOffset = 70;
                     const elementPosition = targetElement.getBoundingClientRect().top;
                     const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                     
                     window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                 }
             });
             tocNavContainer.appendChild(a);
        });
    };
    
    const setupObservers = () => {
        const scrollObserver = new IntersectionObserver((entries) => {
            let intersectingHeadings = [];
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    intersectingHeadings.push(entry.target);
                }
            });

            if (intersectingHeadings.length > 0) {
                intersectingHeadings.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
                const topmostId = intersectingHeadings[0].id;
                tocNavContainer.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                const activeLink = tocNavContainer.querySelector(`a[href="#${topmostId}"]`);
                if(activeLink) activeLink.classList.add('active');
            }
        }, { rootMargin: '-80px 0px -75% 0px', threshold: 0.1 });
        allHeadings.forEach(h => scrollObserver.observe(h));
        
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    animationObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
        document.querySelectorAll('.topic-block').forEach(el => animationObserver.observe(el));
    }

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', () => {
        applyTheme(html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });

    renderContent();
});