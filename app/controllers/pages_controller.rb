class PagesController < ApplicationController
  def home
  end

  def about
  end

  def projects
    # You might want to load projects from a data source
    @projects = [
      {
        title: "Project 1",
        description: "Description of project 1",
        technologies: [ "Rails", "React", "PostgreSQL" ],
        image: "project1.jpg",
        url: "https://project1.com"
      }
      # Add more projects here
    ]
  end

  def contact
  end
end
