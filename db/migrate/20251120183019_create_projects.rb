class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.string :title, null: false
      t.string :subtitle, null: false
      t.text :description, null: false
      t.string :icon
      t.string :color
      t.string :link_text
      t.string :link_url
      t.string :link_icon, default: 'bx-right-arrow-alt'
      t.string :link_target
      t.string :link_rel
      t.string :github_url
      t.jsonb :badges, default: []
      t.integer :position
      t.boolean :published, default: true, null: false
      t.boolean :featured, default: true, null: false
      t.string :route_name

      t.timestamps
    end

    add_index :projects, :position
    add_index :projects, :published
    add_index :projects, :featured
  end
end
