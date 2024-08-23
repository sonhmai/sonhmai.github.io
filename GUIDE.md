
# Instructions

Read [GitHub Pages documentation](https://docs.github.com/en/pages) for comprehensive doc.

## [Create new blog post](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-content-to-your-github-pages-site-using-jekyll)

Public `Github Pages` is built and deployed from `master` branch.

1. Navigate to the `_posts` directory.
2. Create a new file called `YYYY-MM-DD-NAME-OF-POST.md`, replacing `YYYY-MM-DD` with the date of your post and `NAME-OF-POST` with the name of your post.

``` 
# set baseurl to avoid forwarding to real Github Pages
bundle exec jekyll serve --baseurl=""
```

## To run locally (not on GitHub Pages, to serve on your own computer)

1. Clone the repository and made updates as detailed above
2. Make sure you have ruby-dev, bundler, and nodejs installed: `sudo apt install ruby-dev ruby-bundler nodejs`
3. Run `bundle clean` to clean up the directory (no need to run `--force`)
4. Run `bundle install` to install ruby dependencies. If you get errors, delete Gemfile.lock and try again.
5. Run `bundle exec jekyll liveserve` to generate the HTML and serve it from `localhost:4000` the local server will automatically rebuild and refresh the pages on change.

# Appendix

Original theme from https://academicpages.github.io/
